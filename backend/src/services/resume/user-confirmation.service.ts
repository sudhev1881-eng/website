import { logger } from "../../config/logger.js";
import { databaseManager } from "./database-manager.js";
import { validationEngine } from "./validation-engine.js";
import { embeddingGenerator } from "./embedding-generator.js";
import { storageManager } from "./storage-manager.js";
import { newCustomSectionId } from "./schema-mapper.js";
import type {
  IntelligentResumeData,
  SectionDecision,
  SectionDecisions,
  ValidationFlag,
} from "./types.js";

export class ConfirmBlockedError extends Error {
  constructor(public flags: ValidationFlag[]) {
    super("Resume confirmation blocked: complete required certification fields first");
    this.name = "ConfirmBlockedError";
  }
}

export class DraftNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftNotReadyError";
  }
}

/**
 * UserConfirmationService — draft review edits + confirm/reject.
 */
export class UserConfirmationService {
  async getDraft(studentId: string, resumeId: string) {
    return databaseManager.getDraftPayload(resumeId, studentId);
  }

  async patchDraft(
    studentId: string,
    resumeId: string,
    patch: {
      enhancedData?: IntelligentResumeData;
      sectionDecisions?: SectionDecisions;
      sectionKey?: string;
      action?: "accept" | "reject" | "delete" | "edit" | "add_custom";
      data?: unknown;
      index?: number;
      customTitle?: string;
      customItems?: string[];
    },
  ): Promise<{ enhanced: IntelligentResumeData; decisions: SectionDecisions; flags: ValidationFlag[] }> {
    const payload = await databaseManager.getDraftPayload(resumeId, studentId);
    if (!payload?.resume.is_draft) {
      throw new DraftNotReadyError("Draft not found");
    }
    if (payload.resume.processing_status !== "awaiting_confirmation") {
      throw new DraftNotReadyError("Draft is not awaiting confirmation yet");
    }

    let enhanced =
      payload.extracted?.enhanced_data ??
      (payload.extracted?.structured_data as unknown as IntelligentResumeData);
    if (!enhanced) throw new DraftNotReadyError("No extracted data on draft");

    let decisions: SectionDecisions = {
      ...(payload.extracted?.section_decisions ?? {}),
    };

    if (patch.enhancedData) {
      enhanced = patch.enhancedData;
    }
    if (patch.sectionDecisions) {
      decisions = { ...decisions, ...patch.sectionDecisions };
    }

    if (patch.sectionKey && patch.action) {
      const result = applySectionAction(enhanced, decisions, {
        sectionKey: patch.sectionKey,
        action: patch.action,
        data: patch.data,
        index: patch.index,
        customTitle: patch.customTitle,
        customItems: patch.customItems,
      });
      enhanced = result.data;
      decisions = result.decisions;
    }

    const flags = validationEngine.validate(enhanced);
    const ok = await databaseManager.updateDraftSections({
      resumeId,
      studentId,
      enhanced,
      decisions,
      validationFlags: flags,
    });
    if (!ok) throw new DraftNotReadyError("Failed to update draft");

    return { enhanced, decisions, flags };
  }

  async confirm(studentId: string, resumeId: string): Promise<{ resumeId: string; embeddingStatus: string }> {
    const payload = await databaseManager.getDraftPayload(resumeId, studentId);
    if (!payload?.resume.is_draft) {
      throw new DraftNotReadyError("Draft not found");
    }
    if (payload.resume.processing_status !== "awaiting_confirmation") {
      throw new DraftNotReadyError(
        `Draft status is ${payload.resume.processing_status}; expected awaiting_confirmation`,
      );
    }

    const enhanced =
      payload.extracted?.enhanced_data ??
      (payload.extracted?.structured_data as unknown as IntelligentResumeData);
    if (!enhanced) throw new DraftNotReadyError("No extracted data on draft");

    const decisions = payload.extracted?.section_decisions ?? {};
    const flags = (payload.extracted?.validation_flags as ValidationFlag[]) ?? validationEngine.validate(enhanced);
    const blocking = validationEngine.blockingFlags(flags, enhanced);
    // Only block if certifications section is accepted and still incomplete
    const certDecision = decisions.certifications;
    const certAccepted = certDecision?.accepted !== false && certDecision?.deleted !== true;
    if (certAccepted) {
      const stillBlocking = blocking.filter((f) => f.section === "certifications");
      if (stillBlocking.length > 0) {
        throw new ConfirmBlockedError(stillBlocking);
      }
    }

    let previousFilePaths: string[] = [];
    try {
      const result = await databaseManager.confirmDraftReplace({ draftId: resumeId, studentId });
      previousFilePaths = result.previousFilePaths;

      await databaseManager.applyAcceptedProfile({
        studentId,
        data: enhanced,
        decisions,
      });

      // Embeddings are optional — never block confirm
      await databaseManager.setStage(resumeId, studentId, "embedding", "embedding");
      const embedding = await embeddingGenerator.generate(enhanced);
      await databaseManager.replaceEmbeddings({
        studentId,
        resumeId,
        chunks: embedding.chunks,
        status: embedding.status,
      });
      await databaseManager.setStage(resumeId, studentId, "confirmed", "confirmed");

      await storageManager.deleteMany(previousFilePaths);

      logger.info("Resume draft confirmed", {
        resumeId,
        studentId,
        embeddingStatus: embedding.status,
      });

      return { resumeId, embeddingStatus: embedding.status };
    } catch (err) {
      logger.error("Resume confirm failed", {
        resumeId,
        studentId,
        message: err instanceof Error ? err.message : String(err),
      });
      // Best-effort: if replace already committed, leave status failed for visibility
      await databaseManager
        .setStage(resumeId, studentId, "failed", "failed", err instanceof Error ? err.message : "Confirm failed")
        .catch(() => undefined);
      throw err;
    }
  }

  async reject(studentId: string, resumeId: string): Promise<void> {
    const payload = await databaseManager.getDraftPayload(resumeId, studentId);
    if (!payload?.resume.is_draft) {
      throw new DraftNotReadyError("Draft not found");
    }

    const path = await databaseManager.deleteResumeRow(resumeId, studentId);
    await storageManager.deleteObject(path);
    logger.info("Resume draft rejected", { resumeId, studentId });
  }
}

/** Pure section mutation helper — unit-tested. */
export function applySectionAction(
  data: IntelligentResumeData,
  decisions: SectionDecisions,
  action: {
    sectionKey: string;
    action: "accept" | "reject" | "delete" | "edit" | "add_custom";
    data?: unknown;
    index?: number;
    customTitle?: string;
    customItems?: string[];
  },
): { data: IntelligentResumeData; decisions: SectionDecisions } {
  const nextData = structuredClone(data);
  const nextDecisions: SectionDecisions = { ...decisions };
  const key = action.sectionKey;

  const setDecision = (partial: SectionDecision) => {
    nextDecisions[key] = { ...(nextDecisions[key] ?? { accepted: false }), ...partial };
  };

  switch (action.action) {
    case "accept":
      setDecision({ accepted: true, deleted: false, acceptedIndexes: "all" });
      break;
    case "reject":
      setDecision({ accepted: false, deleted: false });
      break;
    case "delete":
      setDecision({ accepted: false, deleted: true });
      if (key === "summary" || key === "objective") {
        (nextData as unknown as Record<string, unknown>)[key] = null;
      } else if (Array.isArray((nextData as unknown as Record<string, unknown>)[key])) {
        if (typeof action.index === "number") {
          const arr = (nextData as unknown as Record<string, unknown>)[key] as unknown[];
          arr.splice(action.index, 1);
        } else {
          (nextData as unknown as Record<string, unknown>)[key] = [];
        }
      } else if (key === "skills") {
        nextData.skills = { technical: [], soft: [], all: [] };
      } else if (key === "customSections" && typeof action.index === "number") {
        nextData.customSections.splice(action.index, 1);
      }
      break;
    case "edit":
      setDecision({ accepted: true, deleted: false });
      if (action.data !== undefined) {
        if (key === "certifications" && typeof action.index === "number") {
          nextData.certifications[action.index] = {
            ...nextData.certifications[action.index],
            ...(action.data as object),
          };
        } else if (key === "experience" && typeof action.index === "number") {
          nextData.experience[action.index] = {
            ...nextData.experience[action.index],
            ...(action.data as object),
          };
        } else if (key === "summary" && typeof action.data === "string") {
          nextData.summary = action.data;
        } else if (key === "objective" && typeof action.data === "string") {
          nextData.objective = action.data;
        } else if (key === "skills" && action.data && typeof action.data === "object") {
          nextData.skills = action.data as IntelligentResumeData["skills"];
        } else if (Array.isArray(action.data) && key in nextData) {
          (nextData as unknown as Record<string, unknown>)[key] = action.data;
        } else if (action.data && typeof action.data === "object" && key in nextData) {
          (nextData as unknown as Record<string, unknown>)[key] = {
            ...((nextData as unknown as Record<string, unknown>)[key] as object),
            ...(action.data as object),
          };
        }
      }
      break;
    case "add_custom": {
      const title = action.customTitle?.trim() || "Custom section";
      const items = action.customItems ?? [];
      nextData.customSections.push({
        id: newCustomSectionId(),
        title,
        items,
      });
      setDecision({ accepted: true, deleted: false, acceptedIndexes: "all" });
      nextDecisions.customSections = { accepted: true, acceptedIndexes: "all" };
      break;
    }
    default:
      break;
  }

  return { data: nextData, decisions: nextDecisions };
}

export const userConfirmationService = new UserConfirmationService();
