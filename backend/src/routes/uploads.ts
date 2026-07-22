import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireStudent, type AuthRequest } from "../middleware/supabase-auth.js";
import { resumeUpload, imageUpload, verifyFileSignature } from "../middleware/upload.js";
import { enqueueResumeProcessing } from "../queues/resume-processing.queue.js";
import {
  isExtractableResumeName,
  isLegacyDocName,
} from "../services/resume-text-extraction.service.js";
import { LEGACY_DOC_MESSAGE } from "../services/docx-extraction.service.js";
import {
  deleteFile,
  resolvePublicFileUrl,
  saveFile,
} from "../services/storage.js";

function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath.includes("://")) return urlOrPath.replace(/^\/api\/uploads\//, "");
  const marker = "/storage/v1/object/public/";
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return urlOrPath;
  const after = urlOrPath.slice(idx + marker.length);
  const slash = after.indexOf("/");
  return slash === -1 ? after : after.slice(slash + 1);
}

export const uploadsRouter = Router();

async function getStudentId(req: AuthRequest): Promise<string | null> {
  if (req.user?.studentId) return req.user.studentId;
  const result = await query<{ id: string }>(
    `SELECT id FROM students WHERE user_id = $1`,
    [req.user!.userId],
  );
  return result.rows[0]?.id ?? null;
}

function handleMulterError(err: unknown, res: import("express").Response) {
  if (err instanceof Error) {
    if (err.message.includes("File too large")) {
      res.status(413).json({ error: "File exceeds size limit" });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Upload failed" });
}

/** POST /api/students/me/resume */
uploadsRouter.post(
  "/me/resume",
  requireAuth,
  requireStudent,
  (req, res, next) => {
    resumeUpload.single("file")(req, res, (err) => {
      if (err) {
        handleMulterError(err, res);
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (!verifyFileSignature(file.buffer, "resume")) {
        res.status(400).json({ error: "File content does not match an allowed document type" });
        return;
      }

      const saved = await saveFile("resumes", studentId, file.originalname, file.buffer);

      const versionResult = await query<{ max: number | null }>(
        `SELECT MAX(version) AS max FROM resumes WHERE student_id = $1`,
        [studentId],
      );
      const nextVersion = (versionResult.rows[0]?.max ?? 0) + 1;

      const extractable = isExtractableResumeName(file.originalname);
      const legacyDoc = isLegacyDocName(file.originalname);
      const processingStatus = extractable ? "pending" : "skipped";
      const errorMessage = legacyDoc
        ? LEGACY_DOC_MESSAGE
        : extractable
          ? null
          : "Skill extraction supports PDF and DOCX only";

      await query(`UPDATE resumes SET is_active = FALSE WHERE student_id = $1`, [studentId]);

      const result = await query(
        `INSERT INTO resumes (
           student_id, file_name, file_size_bytes, file_path, version, is_active,
           processing_status, error_message, processed_at
         )
         VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8) RETURNING *`,
        [
          studentId,
          file.originalname,
          saved.sizeBytes,
          saved.relativePath,
          nextVersion,
          processingStatus,
          errorMessage,
          extractable ? null : new Date(),
        ],
      );

      const row = result.rows[0];

      if (extractable) {
        await enqueueResumeProcessing({
          resumeId: row.id,
          studentId,
          filePath: saved.relativePath,
          fileName: file.originalname,
        });
      }

      const kb = row.file_size_bytes / 1024;

      res.status(201).json({
        id: row.id,
        fileName: row.file_name,
        fileSize: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
        uploadedAt: row.uploaded_at.toISOString().split("T")[0],
        version: row.version,
        downloadUrl: resolvePublicFileUrl(saved.relativePath),
        processingStatus: row.processing_status,
        errorMessage: row.error_message ?? null,
      });
    } catch (err) {
      console.error("POST /students/me/resume error:", err);
      res.status(500).json({ error: "Failed to upload resume" });
    }
  },
);

/** GET /api/students/me/resumes — version history */
uploadsRouter.get("/me/resumes", requireAuth, requireStudent, async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    const result = await query(
      `SELECT r.id, r.file_name, r.file_size_bytes, r.file_path, r.version, r.is_active,
              r.uploaded_at, r.processing_status, r.error_message, r.processed_at,
              (SELECT COUNT(*)::int FROM skills s WHERE s.student_id = r.student_id) AS skills_count
       FROM resumes r WHERE r.student_id = $1 ORDER BY r.version DESC`,
      [studentId],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        fileName: r.file_name,
        version: r.version,
        active: r.is_active,
        uploadedAt: r.uploaded_at.toISOString().split("T")[0],
        downloadUrl: resolvePublicFileUrl(r.file_path),
        processingStatus: r.processing_status,
        errorMessage: r.error_message ?? null,
        processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : null,
        skillsCount: r.skills_count ?? 0,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resume history" });
  }
});

/** GET /api/students/me/resumes/:id — processing status + extracted skills */
uploadsRouter.get(
  "/me/resumes/:id",
  requireAuth,
  requireStudent,
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      const resume = await query<{
        id: string;
        file_name: string;
        file_size_bytes: number;
        file_path: string | null;
        version: number;
        is_active: boolean;
        uploaded_at: Date;
        processing_status: string;
        error_message: string | null;
        processed_at: Date | null;
      }>(
        `SELECT id, file_name, file_size_bytes, file_path, version, is_active,
                uploaded_at, processing_status, error_message, processed_at
         FROM resumes WHERE id = $1 AND student_id = $2`,
        [req.params.id, studentId],
      );

      const row = resume.rows[0];
      if (!row) {
        res.status(404).json({ error: "Resume not found" });
        return;
      }

      const [extracted, skills] = await Promise.all([
        query<{
          raw_text: string;
          structured_data: Record<string, unknown> & {
            skills?: Array<{
              name: string;
              category: string;
              frequency?: number;
              confidence?: number;
            }>;
          };
          extraction_confidence: number | null;
        }>(
          `SELECT raw_text, structured_data, extraction_confidence
           FROM extracted_resume_content WHERE resume_id = $1`,
          [row.id],
        ),
        query<{ name: string; level: number; category: string }>(
          `SELECT name, level, category FROM skills WHERE student_id = $1 ORDER BY sort_order`,
          [studentId],
        ),
      ]);

      const ext = extracted.rows[0];
      const structured = ext?.structured_data ?? {};
      const structuredSkills = (structured.skills ?? []).map((s) => ({
        name: s.name,
        category: s.category,
        confidence: s.confidence ?? Math.min(1, 0.5 + (s.frequency ?? 1) * 0.05),
        frequency: s.frequency ?? 1,
      }));
      const kb = row.file_size_bytes / 1024;

      res.json({
        id: row.id,
        fileName: row.file_name,
        fileSize: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
        version: row.version,
        active: row.is_active,
        uploadedAt: row.uploaded_at.toISOString().split("T")[0],
        downloadUrl: resolvePublicFileUrl(row.file_path),
        processingStatus: row.processing_status,
        errorMessage: row.error_message,
        processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
        extractionConfidence: ext?.extraction_confidence ?? null,
        extractedSkills: structuredSkills,
        structuredData: structured,
        skills: skills.rows,
        skillsCount: skills.rows.length,
        hasExtractedText: Boolean(ext?.raw_text?.trim()),
      });
    } catch (err) {
      console.error("GET /students/me/resumes/:id error:", err);
      res.status(500).json({ error: "Failed to fetch resume status" });
    }
  },
);

/** POST /api/students/me/avatar */
uploadsRouter.post(
  "/me/avatar",
  requireAuth,
  requireStudent,
  (req, res, next) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err) {
        handleMulterError(err, res);
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (!verifyFileSignature(file.buffer, "image")) {
        res.status(400).json({ error: "File content does not match an allowed image type" });
        return;
      }

      const existing = await query<{ avatar_url: string | null }>(
        `SELECT avatar_url FROM students WHERE id = $1`,
        [studentId],
      );
      const oldPath = existing.rows[0]?.avatar_url?.replace(/^\/api\/uploads\//, "");
      if (oldPath) await deleteFile(oldPath);

      const saved = await saveFile("avatars", studentId, file.originalname, file.buffer);

      await query(`UPDATE students SET avatar_url = $2, updated_at = NOW() WHERE id = $1`, [
        studentId,
        saved.publicUrl,
      ]);

      res.json({ avatarUrl: saved.publicUrl });
    } catch (err) {
      console.error("POST /students/me/avatar error:", err);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  },
);

/** POST /api/students/me/cover */
uploadsRouter.post(
  "/me/cover",
  requireAuth,
  requireStudent,
  (req, res, next) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err) {
        handleMulterError(err, res);
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (!verifyFileSignature(file.buffer, "image")) {
        res.status(400).json({ error: "File content does not match an allowed image type" });
        return;
      }

      const existing = await query<{ cover_image_url: string | null }>(
        `SELECT cover_image_url FROM students WHERE id = $1`,
        [studentId],
      );
      const oldUrl = existing.rows[0]?.cover_image_url;
      if (oldUrl) await deleteFile(extractStoragePath(oldUrl));

      const saved = await saveFile("covers", studentId, file.originalname, file.buffer);

      await query(`UPDATE students SET cover_image_url = $2, updated_at = NOW() WHERE id = $1`, [
        studentId,
        saved.publicUrl,
      ]);

      res.json({ coverImageUrl: saved.publicUrl });
    } catch (err) {
      console.error("POST /students/me/cover error:", err);
      res.status(500).json({ error: "Failed to upload cover image" });
    }
  },
);

/** POST /api/students/me/projects/:projectId/image */
uploadsRouter.post(
  "/me/projects/:projectId/image",
  requireAuth,
  requireStudent,
  (req, res, next) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err) {
        handleMulterError(err, res);
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      if (!verifyFileSignature(file.buffer, "image")) {
        res.status(400).json({ error: "File content does not match an allowed image type" });
        return;
      }

      const project = await query<{ id: string; image_url: string | null }>(
        `SELECT id, image_url FROM projects WHERE id = $1 AND student_id = $2`,
        [req.params.projectId, studentId],
      );

      if (!project.rowCount) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const oldUrl = project.rows[0].image_url;
      if (oldUrl) await deleteFile(extractStoragePath(oldUrl));

      const saved = await saveFile("projects", studentId, file.originalname, file.buffer);

      await query(`UPDATE projects SET image_url = $2 WHERE id = $1`, [
        req.params.projectId,
        saved.publicUrl,
      ]);

      res.json({ imageUrl: saved.publicUrl });
    } catch (err) {
      console.error("POST /students/me/projects/:id/image error:", err);
      res.status(500).json({ error: "Failed to upload project image" });
    }
  },
);

