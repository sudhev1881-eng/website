import { Router } from "express";
import bcrypt from "bcryptjs";
import { query, withTransaction } from "../db/pool.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/supabase-auth.js";
import { getStorageStats } from "../services/storage.js";
import { hybridSearchService } from "../services/resume/hybrid-search.service.js";

/** Remove a student row and its linked login user (if any) in one transaction. */
async function deleteStudentAndUser(studentId: string): Promise<boolean> {
  return withTransaction(async (q) => {
    const student = await q<{ id: string; user_id: string | null }>(
      `SELECT id, user_id FROM students WHERE id = $1 FOR UPDATE`,
      [studentId],
    );
    if (!student.rowCount) return false;

    const userId = student.rows[0].user_id;
    await q(`DELETE FROM students WHERE id = $1`, [studentId]);
    if (userId) {
      await q(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    return true;
  });
}

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueUsername(base: string): Promise<string> {
  let username = base;
  let i = 1;
  while (true) {
    const existing = await query(`SELECT id FROM students WHERE username = $1`, [username]);
    if (existing.rowCount === 0) return username;
    username = `${base}-${i++}`;
  }
}

/** GET /api/admin/search?q=&limit= — hybrid talent search (semantic + keyword) */
adminRouter.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      res.status(400).json({ error: "Query parameter q is required" });
      return;
    }
    const limitRaw = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 20;
    const domains = String(req.query.domains ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    const results = await hybridSearchService.searchStudentsForAdmin(q, {
      limit,
      domains: domains.length ? domains : undefined,
    });

    res.json({
      query: q,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("GET /admin/search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

/** GET /api/admin/ai-status — Ollama / resume AI reachability for admins */
adminRouter.get("/ai-status", async (_req, res) => {
  try {
    const { getResumeAiStatus } = await import("../services/ai/ai-factory.js");
    const { getEnv } = await import("../config/env.js");
    const status = await getResumeAiStatus();
    res.json({
      ...status,
      requireConfirmation: getEnv().RESUME_REQUIRE_CONFIRMATION,
      ocrEnabled: getEnv().RESUME_OCR_ENABLED,
      modeLabel: status.ollamaReachable
        ? "Ollama connected"
        : status.configuredProvider === "heuristic"
          ? "Built-in parsing"
          : "Built-in parsing (Ollama optional)",
    });
  } catch (err) {
    console.error("GET /admin/ai-status error:", err);
    res.status(500).json({ error: "Failed to fetch AI status" });
  }
});

/** GET /api/admin/students */
adminRouter.get("/students", async (_req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.name, s.username, u.email, s.university, s.major,
              s.status, s.profile_views, s.created_at, s.user_id,
              nc.card_number AS nfc_card
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN nfc_cards nc ON nc.student_id = s.id AND nc.status = 'active'
       ORDER BY s.name`,
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        username: r.username,
        email: r.email ?? null,
        university: r.university,
        major: r.major,
        status: r.user_id ? r.status : "unclaimed",
        nfcCard: r.nfc_card,
        profileViews: r.profile_views,
        joinedAt: r.created_at?.toISOString().split("T")[0],
      })),
    );
  } catch (err) {
    console.error("GET /admin/students error:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/** POST /api/admin/students */
adminRouter.post("/students", async (req, res) => {
  const { email, password, name, university, major, status } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 10);
    const username = await uniqueUsername(slugify(name));

    const created = await withTransaction(async (q) => {
      await q(
        `DELETE FROM users u
         WHERE lower(u.email) = $1
           AND u.role = 'student'
           AND NOT EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.id)`,
        [normalizedEmail],
      );

      const existing = await q(`SELECT id FROM users WHERE lower(email) = $1`, [normalizedEmail]);
      if (existing.rowCount && existing.rowCount > 0) {
        return { conflict: true as const };
      }

      const userResult = await q<{ id: string }>(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id`,
        [normalizedEmail, passwordHash],
      );

      const userId = userResult.rows[0].id;
      const studentResult = await q(
        `INSERT INTO students (user_id, username, name, university, major, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, username, name, university ?? "", major ?? "", status ?? "pending"],
      );

      return { conflict: false as const, student: studentResult.rows[0], email: normalizedEmail };
    });

    if (created.conflict) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const s = created.student;
    res.status(201).json({
      id: s.id,
      name: s.name,
      username: s.username,
      email: created.email,
      university: s.university,
      major: s.major,
      status: s.status,
      nfcCard: null,
      profileViews: 0,
      joinedAt: s.created_at?.toISOString().split("T")[0],
    });
  } catch (err) {
    console.error("POST /admin/students error:", err);
    res.status(500).json({ error: "Failed to create student" });
  }
});

/** POST /api/admin/students/preregister — name only, for Google claim flow */
adminRouter.post("/students/preregister", async (req, res) => {
  const { name, university, major } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const legalName = name.trim().replace(/\s+/g, " ").toUpperCase();

  try {
    const existing = await query(
      `SELECT id FROM students WHERE UPPER(TRIM(name)) = $1 AND user_id IS NULL`,
      [legalName],
    );
    if (existing.rowCount) {
      res.status(409).json({ error: "A pending profile with this name already exists" });
      return;
    }

    const username = await uniqueUsername(slugify(legalName));

    const result = await query(
      `INSERT INTO students (username, name, university, major, status, user_id)
       VALUES ($1, $2, $3, $4, 'pending', NULL) RETURNING *`,
      [username, legalName, university ?? "", major ?? ""],
    );

    const s = result.rows[0];
    res.status(201).json({
      id: s.id,
      name: s.name,
      username: s.username,
      email: null,
      university: s.university,
      major: s.major,
      status: "unclaimed",
      nfcCard: null,
      profileViews: 0,
      joinedAt: s.created_at?.toISOString().split("T")[0],
    });
  } catch (err) {
    console.error("Preregister error:", err);
    res.status(500).json({ error: "Failed to pre-register student" });
  }
});

/** PATCH /api/admin/students/:id */
adminRouter.patch("/students/:id", async (req, res) => {
  const { id } = req.params;
  const { name, university, major, status } = req.body;

  try {
    const result = await query(
      `UPDATE students SET
        name = COALESCE($2, name),
        university = COALESCE($3, university),
        major = COALESCE($4, major),
        status = COALESCE($5, status),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, name, university, major, status],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const s = result.rows[0];
    const user = await query(`SELECT email FROM users WHERE id = $1`, [s.user_id]);
    const nfc = await query(`SELECT card_number FROM nfc_cards WHERE student_id = $1 AND status = 'active' LIMIT 1`, [id]);

    res.json({
      id: s.id,
      name: s.name,
      username: s.username,
      email: user.rows[0]?.email,
      university: s.university,
      major: s.major,
      status: s.status,
      nfcCard: nfc.rows[0]?.card_number ?? null,
      profileViews: s.profile_views,
      joinedAt: s.created_at?.toISOString().split("T")[0],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update student" });
  }
});

/** POST /api/admin/students/:id/approve — activate a self-registered student */
adminRouter.post("/students/:id/approve", async (req, res) => {
  try {
    const result = await query<{
      id: string;
      name: string;
      username: string;
      university: string;
      major: string;
      status: string;
      profile_views: number;
      created_at: Date;
      email: string | null;
    }>(
      `UPDATE students s
       SET status = 'active', updated_at = NOW()
       FROM users u
       WHERE s.id = $1 AND s.user_id = u.id AND s.status = 'pending'
       RETURNING s.id, s.name, s.username, s.university, s.major, s.status,
                 s.profile_views, s.created_at, u.email`,
      [req.params.id],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "Pending registration not found" });
      return;
    }

    const s = result.rows[0];
    const nfc = await query<{ card_number: string }>(
      `SELECT card_number FROM nfc_cards WHERE student_id = $1 AND status = 'active' LIMIT 1`,
      [s.id],
    );

    res.json({
      id: s.id,
      name: s.name,
      username: s.username,
      email: s.email,
      university: s.university,
      major: s.major,
      status: s.status,
      nfcCard: nfc.rows[0]?.card_number ?? null,
      profileViews: s.profile_views,
      joinedAt: s.created_at.toISOString().split("T")[0],
    });

    if (s.email) {
      const { notifyStudentApproved } = await import("../services/email.service.js");
      notifyStudentApproved({ name: s.name, email: s.email });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to approve student" });
  }
});

/** POST /api/admin/students/:id/decline — reject and remove a pending registration */
adminRouter.post("/students/:id/decline", async (req, res) => {
  try {
    const student = await query<{
      user_id: string | null;
      status: string;
      name: string;
      email: string | null;
    }>(
      `SELECT s.user_id, s.status, s.name, u.email
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [req.params.id],
    );
    if (!student.rowCount) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const row = student.rows[0];
    if (row.status !== "pending" || !row.user_id) {
      res.status(400).json({
        error: "Only pending self-registrations can be declined this way",
      });
      return;
    }

    const removed = await deleteStudentAndUser(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ success: true });

    if (row.email) {
      const { notifyStudentDeclined } = await import("../services/email.service.js");
      notifyStudentDeclined({ name: row.name, email: row.email });
    }
  } catch (err) {
    console.error("Decline student error:", err);
    res.status(500).json({ error: "Failed to decline student" });
  }
});

/** DELETE /api/admin/students/:id */
adminRouter.delete("/students/:id", async (req, res) => {
  try {
    const removed = await deleteStudentAndUser(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete student error:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

/** GET /api/admin/stats */
adminRouter.get("/stats", async (_req, res) => {
  try {
    const [students, cards, universities, storage] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM students`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM nfc_cards WHERE status = 'active'`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM universities`),
      getStorageStats(),
    ]);

    res.json({
      totalStudents: parseInt(students.rows[0].count, 10),
      studentsChange: 0,
      activeCards: parseInt(cards.rows[0].count, 10),
      cardsChange: 0,
      totalUniversities: parseInt(universities.rows[0].count, 10),
      universitiesChange: 0,
      storageUsed: storage.usedPercent,
      storageTotal: storage.totalGb,
      storageUsedGb: storage.usedGb,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/** GET /api/admin/analytics */
adminRouter.get("/analytics", async (_req, res) => {
  try {
    const [signups, taps, topUniversities] = await Promise.all([
      query<{ month: string; count: string }>(
        `SELECT TO_CHAR(created_at, 'Mon') AS month,
                EXTRACT(MONTH FROM created_at)::int AS month_num,
                COUNT(*)::text AS count
         FROM students
         WHERE created_at >= NOW() - INTERVAL '6 months'
         GROUP BY month, month_num
         ORDER BY month_num`,
      ),
      query<{ month: string; count: string }>(
        `SELECT TO_CHAR(COALESCE(last_tap_at, issued_at), 'Mon') AS month,
                EXTRACT(MONTH FROM COALESCE(last_tap_at, issued_at))::int AS month_num,
                COALESCE(SUM(total_taps), 0)::text AS count
         FROM nfc_cards
         WHERE COALESCE(last_tap_at, issued_at) >= NOW() - INTERVAL '6 months'
         GROUP BY month, month_num
         ORDER BY month_num`,
      ),
      query<{ name: string; taps: string }>(
        `SELECT COALESCE(s.university, 'Unknown') AS name,
                COALESCE(SUM(s.nfc_taps), 0)::text AS taps
         FROM students s
         WHERE s.university IS NOT NULL AND s.university != ''
         GROUP BY s.university
         ORDER BY SUM(s.nfc_taps) DESC
         LIMIT 5`,
      ),
    ]);

    const maxTaps = Math.max(...topUniversities.rows.map((r) => parseInt(r.taps, 10)), 1);

    res.json({
      signupsByMonth: signups.rows.map((r) => ({
        month: r.month,
        count: parseInt(r.count, 10),
      })),
      tapsByMonth: taps.rows.map((r) => ({
        month: r.month,
        count: parseInt(r.count, 10),
      })),
      topUniversities: topUniversities.rows.map((r) => ({
        name: r.name,
        taps: parseInt(r.taps, 10),
      })),
      maxTaps,
    });
  } catch (err) {
    console.error("GET /admin/analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

/** GET /api/admin/storage */
adminRouter.get("/storage", async (_req, res) => {
  try {
    const stats = await getStorageStats();
    res.json({
      used: stats.usedGb,
      total: stats.totalGb,
      usedPercent: stats.usedPercent,
      breakdown: stats.breakdown.map((b) => ({
        type: b.type,
        size: b.sizeGb,
        count: b.count,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch storage stats" });
  }
});

/** GET /api/admin/nfc-cards */
adminRouter.get("/nfc-cards", async (_req, res) => {
  try {
    const result = await query(
      `SELECT nc.id, nc.card_number, nc.status, nc.total_taps, nc.issued_at,
              s.name AS student_name, s.university
       FROM nfc_cards nc
       LEFT JOIN students s ON s.id = nc.student_id
       ORDER BY nc.issued_at DESC`,
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        cardNumber: r.card_number,
        student: r.student_name,
        university: r.university ?? "—",
        status: r.status,
        taps: r.total_taps,
        issuedAt: r.issued_at?.toISOString().split("T")[0],
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch NFC cards" });
  }
});

/** POST /api/admin/nfc-cards */
adminRouter.post("/nfc-cards", async (req, res) => {
  const { cardNumber, university } = req.body;

  if (!cardNumber) {
    res.status(400).json({ error: "cardNumber is required" });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO nfc_cards (card_number, status)
       VALUES ($1, 'unassigned') RETURNING *`,
      [cardNumber],
    );

    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      cardNumber: r.card_number,
      student: null,
      university: university ?? "—",
      status: r.status,
      taps: 0,
      issuedAt: r.issued_at?.toISOString().split("T")[0],
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "Card number already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to issue NFC card" });
  }
});

/** PATCH /api/admin/nfc-cards/:id */
adminRouter.patch("/nfc-cards/:id", async (req, res) => {
  const { status, studentId } = req.body;

  try {
    const result = await query(
      `UPDATE nfc_cards SET
        status = COALESCE($2, status),
        student_id = CASE WHEN $3::uuid IS NOT NULL THEN $3::uuid ELSE student_id END,
        issued_at = CASE WHEN $3::uuid IS NOT NULL THEN NOW() ELSE issued_at END
       WHERE id = $1 RETURNING *`,
      [req.params.id, status, studentId ?? null],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "NFC card not found" });
      return;
    }

    const r = result.rows[0];
    const student = r.student_id
      ? await query(`SELECT name, university FROM students WHERE id = $1`, [r.student_id])
      : { rows: [] };

    res.json({
      id: r.id,
      cardNumber: r.card_number,
      student: student.rows[0]?.name ?? null,
      university: student.rows[0]?.university ?? "—",
      status: r.status,
      taps: r.total_taps,
      issuedAt: r.issued_at?.toISOString().split("T")[0],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update NFC card" });
  }
});

/** DELETE /api/admin/nfc-cards/:id */
adminRouter.delete("/nfc-cards/:id", async (req, res) => {
  try {
    const result = await query(`DELETE FROM nfc_cards WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rowCount) {
      res.status(404).json({ error: "NFC card not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete NFC card" });
  }
});

/** GET /api/admin/universities */
adminRouter.get("/universities", async (_req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.admin_name, u.status, u.created_at,
              COUNT(DISTINCT s.id)::int AS students,
              COUNT(DISTINCT nc.id) FILTER (WHERE nc.status = 'active')::int AS active_cards
       FROM universities u
       LEFT JOIN students s ON s.university = u.name
       LEFT JOIN nfc_cards nc ON nc.student_id = s.id
       GROUP BY u.id
       ORDER BY u.name`,
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        admin: r.admin_name,
        status: r.status,
        students: r.students,
        activeCards: r.active_cards,
        joinedAt: r.created_at?.toISOString().split("T")[0],
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});

/** POST /api/admin/universities */
adminRouter.post("/universities", async (req, res) => {
  const { name, adminName, status } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO universities (name, admin_name, status) VALUES ($1, $2, $3) RETURNING *`,
      [name, adminName ?? null, status ?? "active"],
    );

    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      name: r.name,
      admin: r.admin_name,
      status: r.status,
      students: 0,
      activeCards: 0,
      joinedAt: r.created_at?.toISOString().split("T")[0],
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      res.status(409).json({ error: "University already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create university" });
  }
});

/** PATCH /api/admin/universities/:id */
adminRouter.patch("/universities/:id", async (req, res) => {
  const { name, adminName, status } = req.body;

  try {
    const result = await query(
      `UPDATE universities SET
        name = COALESCE($2, name),
        admin_name = COALESCE($3, admin_name),
        status = COALESCE($4, status)
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, adminName, status],
    );

    if (!result.rowCount) {
      res.status(404).json({ error: "University not found" });
      return;
    }

    const r = result.rows[0];
    const counts = await query(
      `SELECT COUNT(DISTINCT s.id)::int AS students,
              COUNT(DISTINCT nc.id) FILTER (WHERE nc.status = 'active')::int AS active_cards
       FROM students s
       LEFT JOIN nfc_cards nc ON nc.student_id = s.id
       WHERE s.university = $1`,
      [r.name],
    );

    res.json({
      id: r.id,
      name: r.name,
      admin: r.admin_name,
      status: r.status,
      students: counts.rows[0]?.students ?? 0,
      activeCards: counts.rows[0]?.active_cards ?? 0,
      joinedAt: r.created_at?.toISOString().split("T")[0],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update university" });
  }
});

/** DELETE /api/admin/universities/:id */
adminRouter.delete("/universities/:id", async (req, res) => {
  try {
    const result = await query(`DELETE FROM universities WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rowCount) {
      res.status(404).json({ error: "University not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete university" });
  }
});
