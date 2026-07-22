import { deleteFile, saveFile, resolvePublicFileUrl } from "../storage.js";
import { logger } from "../../config/logger.js";

/**
 * StorageManager — Supabase helpers for resume staging + cleanup.
 * Virus scanning gap: magic-byte validation only (no ClamAV).
 */
export class StorageManager {
  async savePending(
    studentId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<{ relativePath: string; publicUrl: string; sizeBytes: number }> {
    return saveFile("resumes", studentId, fileName, buffer, undefined, {
      subfolder: "pending",
    });
  }

  async deleteObject(relativePath: string | null | undefined): Promise<void> {
    if (!relativePath) return;
    try {
      await deleteFile(relativePath);
    } catch (err) {
      logger.warn("Storage delete failed", {
        path: relativePath,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async deleteMany(paths: Array<string | null | undefined>): Promise<void> {
    for (const p of paths) {
      await this.deleteObject(p);
    }
  }

  publicUrl(relativePath: string | null | undefined): string | null {
    return resolvePublicFileUrl(relativePath);
  }
}

export const storageManager = new StorageManager();
