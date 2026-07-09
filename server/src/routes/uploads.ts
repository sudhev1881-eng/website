import { Router } from "express";
import path from "node:path";
import { query } from "../db/pool.js";
import { requireAuth, requireStudent, type AuthRequest } from "../middleware/auth.js";
import { resumeUpload, imageUpload } from "../middleware/upload.js";
import {
  deleteFile,
  ensureStorageReady,
  getStoragePath,
  saveFile,
} from "../services/storage.js";

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

      const saved = await saveFile("resumes", studentId, file.originalname, file.buffer);

      const versionResult = await query<{ max: number | null }>(
        `SELECT MAX(version) AS max FROM resumes WHERE student_id = $1`,
        [studentId],
      );
      const nextVersion = (versionResult.rows[0]?.max ?? 0) + 1;

      await query(`UPDATE resumes SET is_active = FALSE WHERE student_id = $1`, [studentId]);

      const result = await query(
        `INSERT INTO resumes (student_id, file_name, file_size_bytes, file_path, version, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
        [studentId, file.originalname, saved.sizeBytes, saved.relativePath, nextVersion],
      );

      const row = result.rows[0];
      const kb = row.file_size_bytes / 1024;

      res.status(201).json({
        id: row.id,
        fileName: row.file_name,
        fileSize: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`,
        uploadedAt: row.uploaded_at.toISOString().split("T")[0],
        version: row.version,
        downloadUrl: `/api/uploads/${saved.relativePath}`,
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
      `SELECT id, file_name, file_size_bytes, file_path, version, is_active, uploaded_at
       FROM resumes WHERE student_id = $1 ORDER BY version DESC`,
      [studentId],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        fileName: r.file_name,
        version: r.version,
        active: r.is_active,
        uploadedAt: r.uploaded_at.toISOString().split("T")[0],
        downloadUrl: r.file_path ? `/api/uploads/${r.file_path}` : null,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resume history" });
  }
});

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

      const existing = await query<{ cover_image_url: string | null }>(
        `SELECT cover_image_url FROM students WHERE id = $1`,
        [studentId],
      );
      const oldPath = existing.rows[0]?.cover_image_url?.replace(/^\/api\/uploads\//, "");
      if (oldPath) await deleteFile(oldPath);

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

/** Static file serving — mounted at /api/uploads in index.ts */
export async function createUploadsStaticRouter() {
  await ensureStorageReady();
  const storagePath = getStoragePath();
  const express = await import("express");
  return express.default.static(storagePath, {
    fallthrough: false,
    setHeaders(res, filePath) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".pdf") {
        res.setHeader("Content-Type", "application/pdf");
      }
    },
  });
}
