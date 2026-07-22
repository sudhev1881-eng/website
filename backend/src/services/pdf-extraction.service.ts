import { logger } from "../config/logger.js";

/**
 * Extract plain text from a PDF buffer.
 *
 * Prefers free `pdfjs-dist` (legacy Node build). If that path fails in this
 * Node runtime, falls back to free `pdf-parse` v2 (`PDFParse`), which also
 * uses pdf.js under the hood with a Node-friendly API.
 *
 * When extractable text is missing/too short (scanned PDF), optionally runs
 * free Tesseract OCR on rendered pages (see RESUME_OCR_ENABLED).
 */
export async function extractText(buffer: Buffer): Promise<string> {
  if (!buffer?.length) {
    throw new Error("Empty PDF buffer");
  }

  // Magic bytes: %PDF
  if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
    throw new Error("File does not appear to be a PDF");
  }

  let text = "";
  let textError: Error | null = null;

  try {
    text = await extractWithPdfJs(buffer);
  } catch (err) {
    textError = err as Error;
    logger.warn("pdfjs-dist extraction failed; falling back to pdf-parse", {
      message: textError.message,
    });
    try {
      text = await extractWithPdfParse(buffer);
      textError = null;
    } catch (err2) {
      textError = err2 as Error;
      text = "";
    }
  }

  if (text.trim().length >= 50) {
    return text.trim();
  }

  // Scanned / image-only PDF — free OCR path
  const ocrEnabled = process.env.RESUME_OCR_ENABLED !== "false";
  if (!ocrEnabled) {
    throw (
      textError ??
      new Error(
        "PDF contained no extractable text (OCR disabled). Upload a text PDF or enable RESUME_OCR_ENABLED.",
      )
    );
  }

  const maxPages = Math.min(
    10,
    Math.max(1, Number(process.env.RESUME_OCR_MAX_PAGES ?? 5) || 5),
  );

  logger.info("PDF text too short; attempting OCR", {
    textLength: text.trim().length,
    maxPages,
  });

  const { extractPdfTextWithOcr } = await import("./pdf-ocr.service.js");
  const ocr = await extractPdfTextWithOcr(buffer, maxPages);
  return ocr.text;
}

async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  // Legacy build is the supported Node entry; avoid browser worker setup.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Copy buffer so pdf.js can transfer ownership of the TypedArray safely.
  const data = new Uint8Array(buffer);

  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const parts: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? String(item.str) : ""))
        .filter(Boolean)
        .join(" ");
      if (pageText.trim()) parts.push(pageText);
    }
  } finally {
    await doc.cleanup();
    await loadingTask.destroy();
  }

  const text = parts.join("\n").replace(/\s+/g, " ").trim();
  if (!text) {
    throw new Error("PDF contained no extractable text");
  }
  return text;
}

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) {
      throw new Error("PDF contained no extractable text");
    }
    return text;
  } finally {
    await parser.destroy();
  }
}
