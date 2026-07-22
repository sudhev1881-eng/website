import { extractText as extractPdfText } from "./pdf-extraction.service.js";
import {
  extractTextFromDocx,
  LEGACY_DOC_MESSAGE,
} from "./docx-extraction.service.js";

export type ResumeFileKind = "pdf" | "docx" | "doc" | "unknown";

/**
 * Detect resume format from magic bytes, falling back to file name/path extension.
 */
export function detectResumeKind(buffer: Buffer, fileNameOrPath?: string): ResumeFileKind {
  if (buffer?.length >= 4) {
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return "pdf";
    }
    if (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    ) {
      return "doc";
    }
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      // ZIP — typically DOCX (or other OOXML); treat as docx for extraction
      return "docx";
    }
  }

  const name = (fileNameOrPath ?? "").toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".doc")) return "doc";
  return "unknown";
}

/** True when this upload should be queued for skill extraction (PDF or DOCX). */
export function isExtractableResumeName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".docx");
}

/** True for legacy binary Word (.doc only, not .docx). */
export function isLegacyDocName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".doc") && !lower.endsWith(".docx");
}

/**
 * Extract plain text from a resume buffer (PDF or DOCX).
 * Legacy .doc throws with a clear user-facing message.
 */
export async function extractResumeText(
  buffer: Buffer,
  fileNameOrPath?: string,
): Promise<string> {
  const kind = detectResumeKind(buffer, fileNameOrPath);

  switch (kind) {
    case "pdf":
      return extractPdfText(buffer);
    case "docx":
      return extractTextFromDocx(buffer);
    case "doc":
      throw new Error(LEGACY_DOC_MESSAGE);
    default:
      throw new Error(
        "Unsupported resume file type — please upload PDF or DOCX",
      );
  }
}
