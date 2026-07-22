import { createWorker, type Worker } from "tesseract.js";
import { logger } from "../config/logger.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      logger: (m: unknown) => {
        const msg = typeof m === "string" ? m : String(m);
        if (msg.toLowerCase().includes("error")) {
          logger.warn("tesseract", { message: msg });
        }
      },
    });
  }
  return workerPromise;
}

/**
 * OCR a single image buffer (PNG/JPEG/WebP) with free Tesseract.js.
 */
export async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  if (!buffer?.length) throw new Error("Empty image buffer for OCR");
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(buffer);
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** Release the shared Tesseract worker (tests / shutdown). */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  try {
    const w = await workerPromise;
    await w.terminate();
  } finally {
    workerPromise = null;
  }
}
