import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireStudent, type AuthRequest } from "../middleware/supabase-auth.js";
import { resumeUpload, imageUpload, verifyFileSignature } from "../middleware/upload.js";
import { enqueueResumeProcessing } from "../queues/resume-processing.queue.js";
import {
  deleteFile,
  resolvePublicFileUrl,
  saveFile,
} from "../services/storage.js";
import {
  resumeUploadService,
  userConfirmationService,
  markSkippedDraftAwaitingConfirm,
  ConfirmBlockedError,
  DraftNotReadyError,
  toLegacyStructuredView,
  type IntelligentResumeData,
} from "../services/resume/index.js";

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

function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

function skillsFromStructured(structured: Record<string, unknown>) {
  const skills = structured.skills;
  if (Array.isArray(skills)) {
    return skills.map((s: { name: string; category: string; frequency?: number; confidence?: number }) => ({
      name: s.name,
      category: s.category,
      confidence: s.confidence ?? Math.min(1, 0.5 + (s.frequency ?? 1) * 0.05),
      frequency: s.frequency ?? 1,
    }));
  }
  const detail = structured.skillsDetail as
    | { all?: Array<{ name: string; category: string; frequency?: number; confidence?: number }> }
    | undefined;
  return (detail?.all ?? []).map((s) => ({
    name: s.name,
    category: s.category,
    confidence: s.confidence ?? Math.min(1, 0.5 + (s.frequency ?? 1) * 0.05),
    frequency: s.frequency ?? 1,
  }));
}

/** POST /api/students/me/resume — stages a draft; does not replace active until confirm */
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

      const draft = await resumeUploadService.createDraft({
        studentId,
        originalName: file.originalname,
        buffer: file.buffer,
      });

      if (draft.extractable) {
        await enqueueResumeProcessing({
          resumeId: draft.resumeId,
          studentId,
          filePath: draft.filePath,
          fileName: draft.fileName,
        });
      } else {
        await markSkippedDraftAwaitingConfirm(draft.resumeId, studentId);
      }

      res.status(201).json({
        id: draft.resumeId,
        draftId: draft.resumeId,
        fileName: draft.fileName,
        fileSize: formatFileSize(draft.fileSizeBytes),
        uploadedAt: new Date().toISOString().split("T")[0],
        version: draft.version,
        downloadUrl: resolvePublicFileUrl(draft.filePath),
        processingStatus: draft.extractable ? draft.processingStatus : "awaiting_confirmation",
        processingStage: draft.extractable ? draft.processingStage : "awaiting_confirmation",
        isDraft: true,
        errorMessage: draft.errorMessage ?? null,
      });
    } catch (err) {
      console.error("POST /students/me/resume error:", err);
      res.status(500).json({ error: "Failed to upload resume" });
    }
  },
);

/** GET /api/students/me/resumes — active + optional draft */
uploadsRouter.get("/me/resumes", requireAuth, requireStudent, async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    const result = await query(
      `SELECT r.id, r.file_name, r.file_size_bytes, r.file_path, r.version, r.is_active,
              r.is_draft, r.uploaded_at, r.processing_status, r.processing_stage,
              r.error_message, r.processed_at,
              (SELECT COUNT(*)::int FROM skills s WHERE s.student_id = r.student_id) AS skills_count
       FROM resumes r
       WHERE r.student_id = $1 AND (r.is_active = TRUE OR r.is_draft = TRUE)
       ORDER BY r.is_draft DESC, r.version DESC`,
      [studentId],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        fileName: r.file_name,
        version: r.version,
        active: r.is_active,
        isDraft: r.is_draft,
        uploadedAt: r.uploaded_at.toISOString().split("T")[0],
        downloadUrl: resolvePublicFileUrl(r.file_path),
        processingStatus: r.processing_status,
        processingStage: r.processing_stage ?? null,
        errorMessage: r.error_message ?? null,
        processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : null,
        skillsCount: r.skills_count ?? 0,
      })),
    );
  } catch (err) {
    console.error("GET /students/me/resumes error:", err);
    res.status(500).json({ error: "Failed to fetch resume history" });
  }
});

/** GET /api/students/me/resumes/draft — current draft if any */
uploadsRouter.get("/me/resumes/draft", requireAuth, requireStudent, async (req: AuthRequest, res) => {
  try {
    const studentId = await getStudentId(req);
    if (!studentId) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    const draftRow = await query<{ id: string }>(
      `SELECT id FROM resumes WHERE student_id = $1 AND is_draft = TRUE LIMIT 1`,
      [studentId],
    );
    const draftId = draftRow.rows[0]?.id;
    if (!draftId) {
      res.json(null);
      return;
    }

    const payload = await userConfirmationService.getDraft(studentId, draftId);
    if (!payload) {
      res.json(null);
      return;
    }

    const { resume: row, extracted: ext } = payload;
    const enhanced = ext?.enhanced_data;
    const structured = enhanced
      ? toLegacyStructuredView(enhanced)
      : (ext?.structured_data ?? {});

    res.json({
      id: row.id,
      draftId: row.id,
      fileName: row.file_name,
      fileSize: formatFileSize(row.file_size_bytes),
      version: row.version,
      active: row.is_active,
      isDraft: row.is_draft,
      uploadedAt: row.uploaded_at.toISOString().split("T")[0],
      downloadUrl: resolvePublicFileUrl(row.file_path),
      processingStatus: row.processing_status,
      processingStage: row.processing_stage,
      errorMessage: row.error_message,
      processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
      extractionConfidence: ext?.extraction_confidence ?? null,
      structuredData: structured,
      enhancedData: enhanced ?? null,
      validationFlags: ext?.validation_flags ?? [],
      sectionDecisions: ext?.section_decisions ?? {},
      hasExtractedText: Boolean(ext?.raw_text?.trim()),
    });
  } catch (err) {
    console.error("GET /students/me/resumes/draft error:", err);
    res.status(500).json({ error: "Failed to fetch resume draft" });
  }
});

/** GET /api/students/me/resumes/:id — processing status + extracted data */
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
        is_draft: boolean;
        uploaded_at: Date;
        processing_status: string;
        processing_stage: string | null;
        error_message: string | null;
        processed_at: Date | null;
      }>(
        `SELECT id, file_name, file_size_bytes, file_path, version, is_active, is_draft,
                uploaded_at, processing_status, processing_stage, error_message, processed_at
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
          structured_data: Record<string, unknown>;
          extraction_confidence: number | null;
          enhanced_data: IntelligentResumeData | null;
          validation_flags: unknown;
          section_decisions: unknown;
        }>(
          `SELECT raw_text, structured_data, extraction_confidence,
                  enhanced_data, validation_flags, section_decisions
           FROM extracted_resume_content WHERE resume_id = $1`,
          [row.id],
        ),
        query<{ name: string; level: number; category: string }>(
          `SELECT name, level, category FROM skills WHERE student_id = $1 ORDER BY sort_order`,
          [studentId],
        ),
      ]);

      const ext = extracted.rows[0];
      const structured =
        (ext?.enhanced_data ? toLegacyStructuredView(ext.enhanced_data) : ext?.structured_data) ??
        {};
      const structuredSkills = skillsFromStructured(structured);

      res.json({
        id: row.id,
        fileName: row.file_name,
        fileSize: formatFileSize(row.file_size_bytes),
        version: row.version,
        active: row.is_active,
        isDraft: row.is_draft,
        uploadedAt: row.uploaded_at.toISOString().split("T")[0],
        downloadUrl: resolvePublicFileUrl(row.file_path),
        processingStatus: row.processing_status,
        processingStage: row.processing_stage,
        errorMessage: row.error_message,
        processedAt: row.processed_at ? new Date(row.processed_at).toISOString() : null,
        extractionConfidence: ext?.extraction_confidence ?? null,
        extractedSkills: structuredSkills,
        structuredData: structured,
        enhancedData: ext?.enhanced_data ?? null,
        validationFlags: ext?.validation_flags ?? [],
        sectionDecisions: ext?.section_decisions ?? {},
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

/** PATCH /api/students/me/resumes/:id/draft — edit/accept/delete sections */
uploadsRouter.patch(
  "/me/resumes/:id/draft",
  requireAuth,
  requireStudent,
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      const result = await userConfirmationService.patchDraft(
        studentId,
        String(req.params.id),
        req.body ?? {},
      );
      res.json({
        structuredData: toLegacyStructuredView(result.enhanced),
        enhancedData: result.enhanced,
        sectionDecisions: result.decisions,
        validationFlags: result.flags,
      });
    } catch (err) {
      if (err instanceof DraftNotReadyError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("PATCH /students/me/resumes/:id/draft error:", err);
      res.status(500).json({ error: "Failed to update resume draft" });
    }
  },
);

/** POST /api/students/me/resumes/:id/confirm — replace single active resume */
uploadsRouter.post(
  "/me/resumes/:id/confirm",
  requireAuth,
  requireStudent,
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      const result = await userConfirmationService.confirm(studentId, String(req.params.id));
      res.json({
        success: true,
        resumeId: result.resumeId,
        embeddingStatus: result.embeddingStatus,
      });
    } catch (err) {
      if (err instanceof ConfirmBlockedError) {
        res.status(400).json({
          error: err.message,
          validationFlags: err.flags,
          needsUserInput: true,
        });
        return;
      }
      if (err instanceof DraftNotReadyError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("POST /students/me/resumes/:id/confirm error:", err);
      res.status(500).json({ error: "Failed to confirm resume" });
    }
  },
);

/** POST /api/students/me/resumes/:id/reject — discard draft; keep active */
uploadsRouter.post(
  "/me/resumes/:id/reject",
  requireAuth,
  requireStudent,
  async (req: AuthRequest, res) => {
    try {
      const studentId = await getStudentId(req);
      if (!studentId) {
        res.status(404).json({ error: "Student profile not found" });
        return;
      }

      await userConfirmationService.reject(studentId, String(req.params.id));
      res.json({ success: true });
    } catch (err) {
      if (err instanceof DraftNotReadyError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error("POST /students/me/resumes/:id/reject error:", err);
      res.status(500).json({ error: "Failed to reject resume draft" });
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
