import { logger } from "../../config/logger.js";
import { downloadFile } from "../storage.js";
import { resumeParser } from "./resume-parser.service.js";
import { aiEnhancementEngine } from "./ai-enhancement.engine.js";
import { validationEngine } from "./validation-engine.js";
import { databaseManager } from "./database-manager.js";
import { emptyIntelligentResumeData } from "./types.js";

export interface ResumePipelineJobData {
  resumeId: string;
  studentId: string;
  filePath: string;
  fileName?: string;
}

/**
 * Orchestrates: extracting → enhancing → validating → awaiting_confirmation.
 * Does NOT mutate student skills/experience until user confirms.
 */
export async function runIntelligentResumePipeline(data: ResumePipelineJobData): Promise<void> {
  const { resumeId, studentId, filePath, fileName } = data;
  logger.info("Intelligent resume pipeline started", { resumeId, studentId });

  await databaseManager.setStage(resumeId, studentId, "extracting", "extracting");

  try {
    const buffer = await downloadFile(filePath);

    await databaseManager.setStage(resumeId, studentId, "extracting", "extracting");
    const parsed = await resumeParser.parseBuffer(buffer, fileName ?? filePath);

    await databaseManager.setStage(resumeId, studentId, "enhancing", "enhancing");
    const enhancement = await aiEnhancementEngine.enhance(parsed.data, parsed.rawText);

    await databaseManager.setStage(resumeId, studentId, "validating", "validating");
    const flags = validationEngine.validate(enhancement.data);

    await databaseManager.saveDraftExtraction({
      resumeId,
      rawText: parsed.rawText,
      rawExtracted: parsed.data,
      enhanced: enhancement.data,
      confidence: parsed.extractionConfidence,
      validationFlags: flags,
    });

    await databaseManager.setStage(
      resumeId,
      studentId,
      "awaiting_confirmation",
      "awaiting_confirmation",
    );

    logger.info("Intelligent resume pipeline awaiting confirmation", {
      resumeId,
      studentId,
      enhanced: enhancement.enhanced,
      skippedReason: enhancement.skippedReason,
      flagCount: flags.length,
      parser: enhancement.data.parser,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resume processing failed";
    logger.error("Intelligent resume pipeline failed", { resumeId, studentId, message });
    await databaseManager.setStage(resumeId, studentId, "failed", "failed", message.slice(0, 1000));
    throw err;
  }
}

/** For skipped/legacy DOC — still park as draft awaiting confirm with empty extraction. */
export async function markSkippedDraftAwaitingConfirm(
  resumeId: string,
  studentId: string,
): Promise<void> {
  const empty = emptyIntelligentResumeData();
  await databaseManager.saveDraftExtraction({
    resumeId,
    rawText: "",
    rawExtracted: empty,
    enhanced: empty,
    confidence: 0,
    validationFlags: [
      {
        code: "skipped_extraction",
        section: "summary",
        message: "File saved without text extraction. Confirm to replace your active resume file.",
        severity: "info",
        needsUserInput: false,
      },
    ],
  });
  await databaseManager.setStage(
    resumeId,
    studentId,
    "awaiting_confirmation",
    "awaiting_confirmation",
  );
}
