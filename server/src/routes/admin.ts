import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

/** GET /api/admin/students */
adminRouter.get("/students", async (_req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.name, s.username, u.email, s.university, s.major,
              s.status, s.profile_views, s.created_at,
              nc.card_number AS nfc_card
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN nfc_cards nc ON nc.student_id = s.id
       ORDER BY s.name`,
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        username: r.username,
        email: r.email,
        university: r.university,
        major: r.major,
        status: r.status,
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

/** GET /api/admin/stats */
adminRouter.get("/stats", async (_req, res) => {
  try {
    const [students, cards, universities] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM students`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM nfc_cards WHERE status = 'active'`),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM universities`),
    ]);

    res.json({
      totalStudents: parseInt(students.rows[0].count, 10),
      studentsChange: 8.4,
      activeCards: parseInt(cards.rows[0].count, 10),
      cardsChange: 12.1,
      totalUniversities: parseInt(universities.rows[0].count, 10),
      universitiesChange: 4.2,
      storageUsed: 68,
      storageTotal: 100,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
