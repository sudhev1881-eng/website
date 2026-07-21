import { Router } from "express";
import { z } from "zod";
import { nfcService } from "../services/nfc.js";
import { query, withTransaction } from "../db/pool.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/supabase-auth.js";
import { logger } from "../config/logger.js";

export const nfcRouter = Router();

const markProgrammedSchema = z.object({
  studentId: z.string().uuid(),
  studentSlug: z.string().min(1).max(100),
  urlWritten: z.string().url().max(2048),
  cardUid: z.string().max(100).nullable().optional(),
  cardNumber: z.string().max(50).nullable().optional(),
  verified: z.boolean(),
});

/** GET /api/nfc/status */
nfcRouter.get("/status", async (_req, res) => {
  try {
    const status = await nfcService.getStatus();
    res.json(status);
  } catch {
    res.status(500).json({ error: "Failed to check NFC reader status" });
  }
});

/**
 * POST /api/nfc/mark-programmed — admin only
 *
 * Called after a successful Web NFC write + read-back on Android Chrome.
 * Upserts nfc_cards with status=active (programmed), programmed_at, programmed_by.
 */
nfcRouter.post(
  "/mark-programmed",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res) => {
    const parsed = markProgrammedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const { studentId, studentSlug, urlWritten, cardUid, cardNumber, verified } =
      parsed.data;

    if (!verified) {
      res.status(400).json({
        error: "Card write must be verified before marking programmed",
      });
      return;
    }

    const adminId = req.user?.userId;
    if (!adminId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const expectedUrl = nfcService.buildProfileUrl(studentSlug);

      // Allow minor trailing-slash differences; reject wrong student URLs
      const normalize = (u: string) => u.replace(/\/$/, "").toLowerCase();
      if (normalize(urlWritten) !== normalize(expectedUrl)) {
        // Still accept if path+src match after URL parse
        try {
          const a = new URL(urlWritten);
          const b = new URL(expectedUrl);
          const same =
            a.origin === b.origin &&
            a.pathname.replace(/\/$/, "") === b.pathname.replace(/\/$/, "") &&
            a.searchParams.get("src") === b.searchParams.get("src");
          if (!same) {
            res.status(400).json({
              error: "urlWritten does not match the expected profile URL for this student",
              expectedUrl,
            });
            return;
          }
        } catch {
          res.status(400).json({ error: "Invalid urlWritten" });
          return;
        }
      }

      const result = await withTransaction(async (q) => {
        const student = await q<{ id: string; username: string }>(
          `SELECT id, username FROM students WHERE id = $1`,
          [studentId],
        );

        if (!student.rowCount) {
          return { notFound: true as const };
        }

        if (student.rows[0].username !== studentSlug) {
          return { slugMismatch: true as const, username: student.rows[0].username };
        }

        const cardNum = cardNumber?.trim() || `SL-WEB-${Date.now()}`;

        const upsert = await q<{
          id: string;
          card_number: string;
          status: string;
          programmed_at: Date | null;
          programmed_by: string | null;
          programmed_url: string | null;
        }>(
          `INSERT INTO nfc_cards (
             card_number, student_id, card_uid, status,
             programmed_at, programmed_by, programmed_url, program_source
           )
           VALUES ($1, $2, $3, 'active', NOW(), $4, $5, 'web_nfc')
           ON CONFLICT (card_number) DO UPDATE SET
             student_id = EXCLUDED.student_id,
             card_uid = COALESCE(EXCLUDED.card_uid, nfc_cards.card_uid),
             status = 'active',
             programmed_at = NOW(),
             programmed_by = EXCLUDED.programmed_by,
             programmed_url = EXCLUDED.programmed_url,
             program_source = 'web_nfc'
           RETURNING id, card_number, status, programmed_at, programmed_by, programmed_url`,
          [cardNum, studentId, cardUid ?? null, adminId, urlWritten],
        );

        // If student already had a different active card, deactivate others
        await q(
          `UPDATE nfc_cards
           SET status = 'deactivated'
           WHERE student_id = $1
             AND id <> $2
             AND status = 'active'`,
          [studentId, upsert.rows[0].id],
        );

        return { card: upsert.rows[0] };
      });

      if ("notFound" in result && result.notFound) {
        res.status(404).json({ error: "Student not found" });
        return;
      }

      if ("slugMismatch" in result && result.slugMismatch) {
        res.status(400).json({
          error: "studentSlug does not match student record",
          username: result.username,
        });
        return;
      }

      const card = result.card!;

      logger.audit("nfc.mark_programmed", {
        adminId,
        studentId,
        cardId: card.id,
        cardNumber: card.card_number,
        urlWritten,
        programSource: "web_nfc",
      });

      res.json({
        success: true,
        verified: true,
        studentId,
        cardNumber: card.card_number,
        cardUid: cardUid ?? null,
        urlWritten: card.programmed_url ?? urlWritten,
        status: card.status,
        programmedAt: card.programmed_at,
        programmedBy: card.programmed_by,
        message: "NFC card marked as programmed",
      });
    } catch (error) {
      logger.error("nfc.mark_programmed_failed", {
        message: error instanceof Error ? error.message : String(error),
        studentId,
      });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to mark card programmed",
      });
    }
  },
);

/** POST /api/nfc/program — admin only (cloud URL registration / legacy) */
nfcRouter.post("/program", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { studentId, studentSlug, cardNumber } = req.body;

  if (!studentId || !studentSlug) {
    res.status(400).json({ error: "studentId and studentSlug are required" });
    return;
  }

  const adminId = req.user?.userId ?? null;

  try {
    const student = await query<{ id: string; username: string }>(
      `SELECT id, username FROM students WHERE id = $1`,
      [studentId],
    );

    if (!student.rowCount) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const slug = student.rows[0].username;
    const result = await nfcService.programCard(slug, cardNumber);

    if (!result.success) {
      res.status(422).json(result);
      return;
    }

    const cardNum = cardNumber ?? `SL-${Date.now()}`;
    await withTransaction(async (q) => {
      await q(
        `INSERT INTO nfc_cards (
           card_number, student_id, card_uid, status,
           programmed_at, programmed_by, programmed_url, program_source
         )
         VALUES ($1, $2, $3, 'active', NOW(), $4, $5, 'cloud')
         ON CONFLICT (card_number) DO UPDATE SET
           student_id = EXCLUDED.student_id,
           card_uid = EXCLUDED.card_uid,
           status = 'active',
           programmed_at = NOW(),
           programmed_by = EXCLUDED.programmed_by,
           programmed_url = EXCLUDED.programmed_url,
           program_source = 'cloud'`,
        [cardNum, studentId, result.cardUid ?? null, adminId, result.urlWritten ?? null],
      );
    });

    logger.audit("nfc.program_cloud", {
      adminId,
      studentId,
      cardNumber: cardNum,
      urlWritten: result.urlWritten,
    });

    res.json({ ...result, studentId, cardNumber: cardNum });
  } catch (error) {
    res.status(500).json({
      success: false,
      verified: false,
      message: error instanceof Error ? error.message : "NFC programming failed",
    });
  }
});
