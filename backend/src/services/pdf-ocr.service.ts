import { createCanvas } from "@napi-rs/canvas";
import { logger } from "../config/logger.js";
import { ocrImageBuffer } from "./ocr.service.js";

const DEFAULT_MAX_PAGES = 5;
const RENDER_SCALE = 1.5;

export interface PdfOcrResult {
  text: string;
  pagesOcrd: number;
  usedOcr: true;
}

/**
 * Render PDF pages to PNG via pdfjs + @napi-rs/canvas, then OCR with Tesseract.
 * Caps pages to limit RAM/CPU on free hosts (e.g. Render).
 */
export async function extractPdfTextWithOcr(
  buffer: Buffer,
  maxPages = DEFAULT_MAX_PAGES,
): Promise<PdfOcrResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });
  const doc = await loadingTask.promise;
  const pageCount = Math.min(doc.numPages, Math.max(1, maxPages));
  const parts: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");
      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
      }).promise;
      const png = canvas.toBuffer("image/png");
      const pageText = await ocrImageBuffer(png);
      if (pageText) parts.push(pageText);
      logger.info("PDF OCR page complete", { pageNum, chars: pageText.length });
    }
  } finally {
    await doc.cleanup();
    await loadingTask.destroy();
  }

  const text = parts.join("\n\n").replace(/\s+/g, " ").trim();
  if (text.length < 40) {
    throw new Error(
      "OCR could not read enough text from this scanned PDF — try a clearer scan or a text PDF",
    );
  }

  return { text, pagesOcrd: pageCount, usedOcr: true };
}
