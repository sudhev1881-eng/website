import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireStudent, type AuthRequest } from "../middleware/auth.js";

export const studentsRouter = Router();

studentsRouter.use(requireAuth, requireStudent);

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

async function getStudentId(req: AuthRequest): Promise<string | null> {
  if (req.user?.studentId) return req.user.studentId;
  const result = await query<{ id: string }>(
    `SELECT id FROM students WHERE user_id = $1`,
    [req.user!.userId],
  );
  return result.rows[0]?.id ?? null;
}

/** GET /api/students/me — full dashboard data */
studentsRouter.get("/me", async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    const [student, projects, skills, certificates, experience, resume, nfc] =
      await Promise.all([
        query(`SELECT * FROM students WHERE id = $1`, [studentId]),
        query(`SELECT * FROM projects WHERE student_id = $1 ORDER BY sort_order`, [studentId]),
        query(`SELECT * FROM skills WHERE student_id = $1 ORDER BY sort_order`, [studentId]),
        query(`SELECT * FROM certificates WHERE student_id = $1 ORDER BY sort_order`, [studentId]),
        query(`SELECT * FROM experience WHERE student_id = $1 ORDER BY sort_order`, [studentId]),
        query(`SELECT * FROM resumes WHERE student_id = $1 AND is_active = TRUE ORDER BY version DESC LIMIT 1`, [studentId]),
        query(`SELECT * FROM nfc_cards WHERE student_id = $1 LIMIT 1`, [studentId]),
      ]);

    const s = student.rows[0];

    res.json({
      profile: {
        id: s.id,
        name: s.name,
        email: req.user!.email,
        username: s.username,
        university: s.university,
        major: s.major,
        graduationYear: s.graduation_year,
        bio: s.bio,
        avatar: s.avatar_url,
        coverImage: s.cover_image_url,
        location: s.location,
        github: s.github,
        linkedin: s.linkedin,
        portfolio: s.portfolio,
        phone: s.phone,
        title: s.title,
      },
      stats: {
        profileViews: s.profile_views,
        profileViewsChange: 12.5,
        nfcTaps: s.nfc_taps,
        nfcTapsChange: 8.2,
        resumeDownloads: s.resume_downloads,
        resumeDownloadsChange: 15.3,
        recruiterContacts: 12,
        recruiterContactsChange: -2.1,
      },
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
      resume: formatResume(resume.rows[0] as {
        file_name: string;
        file_size_bytes: number;
        file_path: string | null;
        version: number;
        uploaded_at: Date;
      } | undefined),
      nfcCard: nfc.rows[0]
        ? {
            id: nfc.rows[0].id,
            status: nfc.rows[0].status,
            cardNumber: nfc.rows[0].card_number,
            linkedAt: nfc.rows[0].issued_at?.toISOString().split("T")[0],
            totalTaps: nfc.rows[0].total_taps,
            lastTap: nfc.rows[0].last_tap_at,
            profileUrl: `/u/${s.username}`,
          }
        : null,
      analytics: {
        viewsByDay: [
          { day: "Mon", views: 12, taps: 3 },
          { day: "Tue", views: 18, taps: 5 },
          { day: "Wed", views: 24, taps: 8 },
          { day: "Thu", views: 15, taps: 4 },
          { day: "Fri", views: 32, taps: 12 },
          { day: "Sat", views: 8, taps: 2 },
          { day: "Sun", views: 6, taps: 1 },
        ],
        topReferrers: [
          { source: "NFC Tap", count: s.nfc_taps, percent: 52 },
          { source: "Direct Link", count: 45, percent: 26 },
          { source: "LinkedIn", count: 28, percent: 16 },
          { source: "QR Code", count: 10, percent: 6 },
        ],
      },
    });
  } catch (err) {
    console.error("GET /students/me error:", err);
    res.status(500).json({ error: "Failed to fetch student data" });
  }
});

/** PATCH /api/students/me — update profile */
studentsRouter.patch("/me", async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    const {
      name, university, major, graduationYear, bio, location,
      github, linkedin, portfolio, phone, title,
    } = req.body;

    const result = await query(
      `UPDATE students SET
        name = COALESCE($2, name),
        university = COALESCE($3, university),
        major = COALESCE($4, major),
        graduation_year = COALESCE($5, graduation_year),
        bio = COALESCE($6, bio),
        location = COALESCE($7, location),
        github = COALESCE($8, github),
        linkedin = COALESCE($9, linkedin),
        portfolio = COALESCE($10, portfolio),
        phone = COALESCE($11, phone),
        title = COALESCE($12, title),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [studentId, name, university, major, graduationYear, bio, location, github, linkedin, portfolio, phone, title],
    );

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error("PATCH /students/me error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/** POST /api/students/me/projects */
studentsRouter.post("/me/projects", async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) { res.status(404).json({ error: "Not found" }); return; }

    const { title, description, tech, url, featured } = req.body;
    const result = await query(
      `INSERT INTO projects (student_id, title, description, tech, url, featured)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [studentId, title, description ?? "", tech ?? [], url ?? "", featured ?? false],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

/** DELETE /api/students/me/projects/:id */
studentsRouter.delete("/me/projects/:id", async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    await query(`DELETE FROM projects WHERE id = $1 AND student_id = $2`, [req.params.id, studentId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

/** POST /api/students/me/skills */
studentsRouter.post("/me/skills", async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) { res.status(404).json({ error: "Not found" }); return; }

    const { name, level, category } = req.body;
    const result = await query(
      `INSERT INTO skills (student_id, name, level, category) VALUES ($1, $2, $3, $4) RETURNING *`,
      [studentId, name, level ?? 50, category ?? "General"],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create skill" });
  }
});

/** POST /api/students/me/certificates */
studentsRouter.post("/me/certificates", async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) { res.status(404).json({ error: "Not found" }); return; }

    const { name, issuer, date, url } = req.body;
    const result = await query(
      `INSERT INTO certificates (student_id, name, issuer, issued_date, url) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [studentId, name, issuer, date, url ?? ""],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create certificate" });
  }
});
