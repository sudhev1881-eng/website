import { Router } from "express";
import { query } from "../db/pool.js";
import { logProfileEvent } from "../services/analytics.js";
import { createSignedFileUrl } from "../services/storage.js";
import {
  buildPublicAiFromResume,
  buildPublicProfileFallbackFromResume,
  buildSecondaryPublicFields,
} from "../services/resume/profile-builder.js";
import { coerceToIntelligentResumeData } from "../services/resume/schema-mapper.js";
import type { SectionDecisions } from "../services/resume/types.js";
import { logger } from "../config/logger.js";

export const profilesRouter = Router();

async function formatResume(row: {
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
    downloadUrl: await createSignedFileUrl(row.file_path),
  };
}

function empty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return !v.trim();
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

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

/** GET /api/profiles/:slug/resume — track download and return file URL */
profilesRouter.get("/:slug/resume", async (req, res) => {
  try {
    const { slug } = req.params;
    const studentResult = await query<{ id: string }>(
      `SELECT id FROM students WHERE username = $1 AND status = 'active'`,
      [slug],
    );

    if (!studentResult.rowCount) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const studentId = studentResult.rows[0].id;
    const resume = await query<{ file_path: string | null }>(
      `SELECT file_path FROM resumes
       WHERE student_id = $1 AND is_active = TRUE AND COALESCE(is_draft, FALSE) = FALSE
       ORDER BY version DESC LIMIT 1`,
      [studentId],
    );

    if (!resume.rows[0]?.file_path) {
      res.status(404).json({ error: "No resume available" });
      return;
    }

    query(`UPDATE students SET resume_downloads = resume_downloads + 1 WHERE id = $1`, [studentId]).catch(() => {});
    logProfileEvent(studentId, "resume_download", "public").catch(() => {});

    res.json({ downloadUrl: await createSignedFileUrl(resume.rows[0].file_path) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resume" });
  }
});

/** GET /api/profiles/:slug — public profile (no auth) */
profilesRouter.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Intentionally omit users.email — private contact stays off the public profile.
    const studentResult = await query(
      `SELECT s.* FROM students s
       WHERE s.username = $1 AND s.status = 'active'`,
      [slug],
    );

    if (!studentResult.rowCount) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const s = studentResult.rows[0];

    const trackNfcTap = req.query.src === "nfc";

    // Increment view count (async, don't block response)
    query(`UPDATE students SET profile_views = profile_views + 1 WHERE id = $1`, [s.id]).catch(() => {});

    if (trackNfcTap) {
      query(`UPDATE students SET nfc_taps = nfc_taps + 1 WHERE id = $1`, [s.id]).catch(() => {});
      query(
        `UPDATE nfc_cards SET total_taps = total_taps + 1, last_tap_at = NOW() WHERE student_id = $1`,
        [s.id],
      ).catch(() => {});
      logProfileEvent(s.id, "nfc_tap", "nfc").catch(() => {});
    } else {
      logProfileEvent(s.id, "view", typeof req.query.ref === "string" ? req.query.ref : "direct").catch(() => {});
    }

    const [projects, skills, certificates, experience, resume] = await Promise.all([
      query(`SELECT * FROM projects WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(`SELECT * FROM skills WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(`SELECT * FROM certificates WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(`SELECT * FROM experience WHERE student_id = $1 ORDER BY sort_order`, [s.id]),
      query(
        `SELECT r.*, e.enhanced_data, e.structured_data, e.section_decisions
         FROM resumes r
         LEFT JOIN extracted_resume_content e ON e.resume_id = r.id
         WHERE r.student_id = $1 AND r.is_active = TRUE AND COALESCE(r.is_draft, FALSE) = FALSE
         ORDER BY r.version DESC LIMIT 1`,
        [s.id],
      ),
    ]);

    let bio = s.bio as string;
    let university = s.university as string;
    let major = s.major as string;
    let title = s.title as string;
    let github = (s.github as string) || "";
    let linkedin = (s.linkedin as string) || "";
    let portfolio = (s.portfolio as string) || "";
    let location = (s.location as string) || "";
    const graduationYear =
      typeof s.graduation_year === "number" ? (s.graduation_year as number) : null;
    let gpa: string | null = null;
    let educationRows: Array<{
      id: string;
      school: string;
      degree: string | null;
      field: string | null;
      startDate: string | null;
      endDate: string | null;
      gpa: string | null;
    }> = [];

    let projectRows = projects.rows.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      tech: p.tech,
      url: p.url,
      image: p.image_url,
      featured: p.featured,
    }));

    let skillRows = skills.rows.map((sk) => ({
      id: sk.id as string | undefined,
      name: sk.name,
      level: sk.level,
      category: sk.category,
    }));

    let certificateRows = certificates.rows.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      date: c.issued_date,
      url: c.url,
    }));

    let experienceRows = experience.rows.map((e) => ({
      id: e.id,
      role: e.role,
      company: e.company,
      period: e.period,
      description: e.description,
    }));

    // Fallback: confirmed resume with enhanced/accepted data but empty profile tables
    const resumeRow = resume.rows[0] as
      | {
          file_name: string;
          file_size_bytes: number;
          file_path: string | null;
          version: number;
          uploaded_at: Date;
          enhanced_data: unknown;
          structured_data: unknown;
          section_decisions: SectionDecisions | null;
          processing_status?: string;
        }
      | undefined;

    const needsFallback =
      resumeRow &&
      (empty(bio) ||
        experienceRows.length === 0 ||
        projectRows.length === 0 ||
        skillRows.length === 0 ||
        certificateRows.length === 0 ||
        educationRows.length === 0 ||
        empty(university) ||
        empty(major) ||
        empty(location) ||
        empty(github) ||
        empty(linkedin) ||
        empty(portfolio));

    const enhanced =
      coerceToIntelligentResumeData(resumeRow?.enhanced_data) ??
      coerceToIntelligentResumeData(resumeRow?.structured_data);

    if (needsFallback && enhanced) {
      try {
        const fb = buildPublicProfileFallbackFromResume({
          enhanced,
          decisions: resumeRow.section_decisions ?? {},
          defaultAcceptMissing: true,
        });

        if (empty(bio) && fb.bio) bio = fb.bio;
        if (empty(university) && fb.university) university = fb.university;
        if (empty(major) && fb.major) major = fb.major;
        if ((empty(title) || title === "Student") && fb.title) title = fb.title;
        if (empty(github) && fb.github) github = fb.github;
        if (empty(linkedin) && fb.linkedin) linkedin = fb.linkedin;
        if (empty(portfolio) && fb.portfolio) portfolio = fb.portfolio;
        if (empty(location) && fb.location) location = fb.location;

        if (experienceRows.length === 0 && fb.experience.length > 0) {
          experienceRows = fb.experience;
        }
        if (projectRows.length === 0 && fb.projects.length > 0) {
          projectRows = fb.projects.map((p) => ({
            ...p,
            image: null as string | null,
          }));
        }
        if (skillRows.length === 0 && fb.skills.length > 0) {
          skillRows = fb.skills.map((sk) => ({
            id: undefined as string | undefined,
            name: sk.name,
            level: sk.level,
            category: sk.category,
          }));
        }
        if (certificateRows.length === 0 && fb.certificates.length > 0) {
          certificateRows = fb.certificates;
        }
        if (educationRows.length === 0 && fb.education.length > 0) {
          educationRows = fb.education;
        }
        if (!gpa && fb.gpa) gpa = fb.gpa;
      } catch (fallbackErr) {
        // Never fail the public profile because resume-shaped fallback data is incomplete
        logger.warn("GET /profiles/:slug resume fallback skipped", {
          error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
        });
      }
    }

    // Seed education from student record when resume education is empty
    if (educationRows.length === 0 && (university || major)) {
      educationRows = [
        {
          id: "student-edu",
          school: university || "University",
          degree: null,
          field: major || null,
          startDate: null,
          endDate: graduationYear ? String(graduationYear) : null,
          gpa: null,
        },
      ];
    }

    const { aiGenerated, ai } = buildPublicAiFromResume(enhanced);
    const secondary = buildSecondaryPublicFields(enhanced);

    // Prefer AI title when student title is empty / default
    if (ai?.title && (empty(title) || title === "Student")) {
      title = ai.title;
    }

    res.json({
      username: s.username,
      name: s.name,
      title,
      university,
      major,
      bio,
      avatar: s.avatar_url,
      coverImage: s.cover_image_url,
      github,
      linkedin,
      portfolio,
      location: location || null,
      graduationYear,
      gpa,
      education: educationRows,
      languages: secondary.languages,
      interests: secondary.interests,
      volunteer: secondary.volunteer,
      updatedAt: s.updated_at
        ? new Date(s.updated_at as string | Date).toISOString()
        : null,
      aiGenerated,
      ai,
      // Private contact intentionally omitted from public profiles
      resume: await formatResume(resumeRow),
      projects: projectRows,
      skills: skillRows,
      certificates: certificateRows,
      experience: experienceRows,
    });
  } catch (err) {
    logger.error("GET /profiles/:slug error", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});
