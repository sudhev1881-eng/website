import { query } from "../../db/pool.js";
import { logger } from "../../config/logger.js";
import { deleteFile, saveFile } from "../storage.js";
import {
  isExtractableResumeName,
  isLegacyDocName,
} from "../resume-text-extraction.service.js";
import { LEGACY_DOC_MESSAGE } from "../docx-extraction.service.js";

export interface UploadedResumeDraft {
  resumeId: string;
  studentId: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  version: number;
  processingStatus: string;
  processingStage: string;
  errorMessage: string | null;
  isDraft: true;
  extractable: boolean;
}

/**
 * ResumeUploadService — stages file under resumes/{studentId}/pending/...
 * Does NOT deactivate the active resume. Replaces any existing draft.
 */
export class ResumeUploadService {
  async createDraft(params: {
    studentId: string;
    originalName: string;
    buffer: Buffer;
  }): Promise<UploadedResumeDraft> {
    const { studentId, originalName, buffer } = params;

    await this.cancelExistingDraft(studentId);

    const saved = await saveFile("resumes", studentId, originalName, buffer, undefined, {
      subfolder: "pending",
    });

    const versionResult = await query<{ max: number | null }>(
      `SELECT MAX(version) AS max FROM resumes WHERE student_id = $1`,
      [studentId],
    );
    const nextVersion = (versionResult.rows[0]?.max ?? 0) + 1;

    const extractable = isExtractableResumeName(originalName);
    const legacyDoc = isLegacyDocName(originalName);
    const processingStatus = extractable ? "pending" : "skipped";
    const processingStage = extractable ? "uploaded" : "awaiting_confirmation";
    const errorMessage = legacyDoc
      ? LEGACY_DOC_MESSAGE
      : extractable
        ? null
        : "Skill extraction supports PDF and DOCX only";

    const result = await query<{
      id: string;
      version: number;
      processing_status: string;
      processing_stage: string | null;
      error_message: string | null;
      file_size_bytes: number;
      file_path: string;
      file_name: string;
    }>(
      `INSERT INTO resumes (
         student_id, file_name, file_size_bytes, file_path, version,
         is_active, is_draft, processing_status, processing_stage, error_message, processed_at
       )
       VALUES ($1, $2, $3, $4, $5, FALSE, TRUE, $6, $7, $8, $9)
       RETURNING id, version, processing_status, processing_stage, error_message,
                 file_size_bytes, file_path, file_name`,
      [
        studentId,
        originalName,
        saved.sizeBytes,
        saved.relativePath,
        nextVersion,
        processingStatus,
        processingStage,
        errorMessage,
        extractable ? null : new Date(),
      ],
    );

    const row = result.rows[0];
    logger.info("Resume draft uploaded", {
      resumeId: row.id,
      studentId,
      extractable,
      path: saved.relativePath,
    });

    return {
      resumeId: row.id,
      studentId,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSizeBytes: row.file_size_bytes,
      version: row.version,
      processingStatus: row.processing_status,
      processingStage: row.processing_stage ?? processingStage,
      errorMessage: row.error_message,
      isDraft: true,
      extractable,
    };
  }

  /** Delete staging draft + storage object; leave active resume intact. */
  async cancelExistingDraft(studentId: string): Promise<void> {
    const existing = await query<{ id: string; file_path: string | null }>(
      `SELECT id, file_path FROM resumes WHERE student_id = $1 AND is_draft = TRUE`,
      [studentId],
    );

    for (const row of existing.rows) {
      await query(`DELETE FROM resumes WHERE id = $1 AND student_id = $2`, [row.id, studentId]);
      await deleteFile(row.file_path).catch((err) => {
        logger.warn("Failed to delete draft storage object", {
          path: row.file_path,
          message: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }
}

export const resumeUploadService = new ResumeUploadService();
