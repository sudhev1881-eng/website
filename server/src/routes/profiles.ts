import { Router } from "express";
import { query } from "../db/pool.js";

export const profilesRouter = Router();

function formatResume(row: {
  file_name: string;
  file_size_bytes: number;
  file_path: string | null;
  version: number;
  uploaded_at: Date;
} | undefined) {
  if (!row) return null;
  const kb = row.file_size_bytes / 1024;
  return {
    fileName: row.file_name,
    fileSize: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
    uploadedAt: row.uploaded_at.toISOString().split("T")[0],
    version: row.version,
    downloadUrl: row.file_path ? `/api/uploads/${row.file_path}` : null,
  };
}

/** GET /api/profiles/:slug — public profile (no auth) */
profilesRouter.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const studentResult = await query(
      `SELECT s.*, u.email FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.username = $1 AND s.status = 'active'`,
      [slug],
    );

    if (!studentResult.rowCount) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const s = studentResult.rows[0];

    // Increment view count (async, don't block response)
    query(`UPDATE students SET profile_views = profile_views + 1 WHERE id = $1`, [s.id]).catch(() => {});

    const [projects, skills, certificates, experience, resume] = await Promise.all([
      query(`SELECT * FROM projects WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(`SELECT * FROM skills WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(`SELECT * FROM certificates WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(`SELECT * FROM experience WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(`SELECT * FROM resumes WHERE student_id = $1 AND is_active = TRUE ORDER BY version DESC LIMIT 1`, [s.id]),
    ]);

    res.json({
      username: s.username,
      name: s.name,
      title: s.title,
      university: s.university,
      major: s.major,
      bio: s.bio,
      avatar: s.avatar_url,
      coverImage: s.cover_image_url,
      github: s.github,
      linkedin: s.linkedin,
      portfolio: s.portfolio,
      email: s.email,
      phone: s.phone,
      resume: formatResume(resume.rows[0] as {
        file_name: string;
        file_size_bytes: number;
        file_path: string | null;
        version: number;
        uploaded_at: Date;
      } | undefined),
      projects: projects.rows.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        tech: p.tech,
        url: p.url,
        image: p.image_url,
        featured: p.featured,
      })),
      skills: skills.rows.map((sk) => ({
        name: sk.name,
        level: sk.level,
        category: sk.category,
      })),
      certificates: certificates.rows.map((c) => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer,
        date: c.issued_date,
        url: c.url,
      })),
      experience: experience.rows.map((e) => ({
        id: e.id,
        role: e.role,
        company: e.company,
        period: e.period,
        description: e.description,
      })),
    });
  } catch (err) {
    console.error("GET /profiles/:slug error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/** GET /api/profiles — list all public usernames */
profilesRouter.get("/", async (_req, res) => {
  try {
    const result = await query<{ username: string }>(
      `SELECT username FROM students WHERE status = 'active' ORDER BY username`,
    );
    res.json(result.rows.map((r) => r.username));
  } catch (err) {
    res.status(500).json({ error: "Failed to list profiles" });
  }
});
