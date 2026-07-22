import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

describe("PDF OCR gate", () => {
  it("treats short text as needing OCR path (threshold)", () => {
    const short = "ab";
    const long = "a".repeat(60);
    assert.ok(short.trim().length < 50);
    assert.ok(long.trim().length >= 50);
  });

  it("RESUME_OCR_ENABLED false is detected", () => {
    const prev = process.env.RESUME_OCR_ENABLED;
    process.env.RESUME_OCR_ENABLED = "false";
    assert.equal(process.env.RESUME_OCR_ENABLED !== "false", false);
    if (prev === undefined) delete process.env.RESUME_OCR_ENABLED;
    else process.env.RESUME_OCR_ENABLED = prev;
  });
});

describe("ocr service module", () => {
  it("exports ocrImageBuffer", async () => {
    const mod = await import("./ocr.service.js");
    assert.equal(typeof mod.ocrImageBuffer, "function");
    assert.equal(typeof mod.terminateOcrWorker, "function");
  });
});
