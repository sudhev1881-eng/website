import { logger } from "../config/logger.js";

const LEGACY_DOC_MESSAGE =
  "Legacy .doc not supported — please upload PDF or DOCX";

/**
 * Extract plain text from a DOCX (Office Open XML) buffer via free `mammoth`.
 * Legacy binary `.doc` (OLE2) is not supported.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  if (!buffer?.length) {
    throw new Error("Empty DOCX buffer");
  }

  // OLE2 compound document — legacy .doc
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    throw new Error(LEGACY_DOC_MESSAGE);
  }

  // DOCX is a ZIP package (PK..)
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("File does not appear to be a DOCX document");
  }

  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  if (result.messages?.length) {
    logger.debug("mammoth extraction messages", {
      count: result.messages.length,
      first: result.messages[0]?.message,
    });
  }

  const text = (result.value ?? "").replace(/\s+/g, " ").trim();
  if (!text) {
    throw new Error("DOCX contained no extractable text");
  }
  return text;
}

export { LEGACY_DOC_MESSAGE };
