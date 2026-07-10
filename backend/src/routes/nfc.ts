import { Router } from "express";
import { nfcService } from "../services/nfc.js";
import { query } from "../db/pool.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/supabase-auth.js";

export const nfcRouter = Router();

/** GET /api/nfc/status */
nfcRouter.get("/status", async (_req, res) => {
  try {
    const status = await nfcService.getStatus();
    res.json(status);
  } catch {
    res.status(500).json({ error: "Failed to check NFC reader status" });
  }
});

/** POST /api/nfc/program — admin only */
nfcRouter.post("/program", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const { studentId, studentSlug, cardNumber } = req.body;

  if (!studentId || !studentSlug) {
    res.status(400).json({ error: "studentId and studentSlug are required" });
    return;
  }

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

    // Persist card assignment in PostgreSQL
    const cardNum = cardNumber ?? `SL-${Date.now()}`;
    await query(
      `INSERT INTO nfc_cards (card_number, student_id, card_uid, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (card_number) DO UPDATE SET
         student_id = EXCLUDED.student_id,
         card_uid = EXCLUDED.card_uid,
         status = 'active'`,
      [cardNum, studentId, result.cardUid ?? null],
    );

    res.json({ ...result, studentId, cardNumber: cardNum });
  } catch (error) {
    res.status(500).json({
      success: false,
      verified: false,
      message: error instanceof Error ? error.message : "NFC programming failed",
    });
  }
});
