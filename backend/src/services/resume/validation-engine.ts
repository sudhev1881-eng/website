import type { IntelligentResumeData, ValidationFlag } from "./types.js";

/**
 * ValidationEngine — flags missing fields for user prompts.
 * Never invents or auto-fills missing certification details.
 */
export class ValidationEngine {
  validate(
    data: IntelligentResumeData,
    options?: {
      rawTextLength?: number;
      /** When AI/Ollama enrichment was skipped or failed — mild draft note only. */
      aiSkippedReason?: "unavailable" | "empty" | "llm_failed" | "heuristic_only";
    },
  ): ValidationFlag[] {
    const flags: ValidationFlag[] = [];

    const rawLen = options?.rawTextLength;
    if (typeof rawLen === "number" && rawLen < 40) {
      flags.push({
        code: "extraction_sparse",
        section: "summary",
        message:
          "Little text could be read from this file. Prefer a text PDF or DOCX; scanned PDFs may need a clearer scan.",
        severity: "warning",
        needsUserInput: false,
      });
    }

    if (
      options?.aiSkippedReason === "unavailable" ||
      options?.aiSkippedReason === "llm_failed"
    ) {
      flags.push({
        code: "ai_fallback",
        section: "summary",
        message: "Using built-in parsing",
        severity: "info",
        needsUserInput: false,
      });
    }

    if (!data.contact.emails.length && !data.contact.phones.length) {
      flags.push({
        code: "contact_sparse",
        section: "contact",
        message: "No email or phone detected — add contact details if missing.",
        severity: "info",
        needsUserInput: false,
      });
    }

    if (!data.summary && !data.objective) {
      flags.push({
        code: "summary_missing",
        section: "summary",
        message: "No professional summary found.",
        severity: "info",
        needsUserInput: false,
      });
    }

    if (data.experience.length === 0) {
      flags.push({
        code: "experience_missing",
        section: "experience",
        message: "No work experience detected.",
        severity: "info",
        needsUserInput: false,
      });
    }

    if (data.education.length === 0) {
      flags.push({
        code: "education_missing",
        section: "education",
        message: "No education entries detected.",
        severity: "info",
        needsUserInput: false,
      });
    }

    if (data.skills.all.length === 0 && data.skills.technical.length === 0) {
      flags.push({
        code: "skills_missing",
        section: "skills",
        message: "No skills detected.",
        severity: "info",
        needsUserInput: false,
      });
    }

    data.certifications.forEach((cert, itemIndex) => {
      const missing: string[] = [];
      if (!cert.issuer?.trim()) missing.push("issuer");
      if (!cert.issueDate?.trim()) missing.push("issue date");
      if (!cert.credentialId?.trim() && !cert.credentialUrl?.trim()) {
        missing.push("credential id or URL");
      }
      if (missing.length > 0) {
        flags.push({
          code: "certification_incomplete",
          section: "certifications",
          message: `Certification "${cert.name}" is missing ${missing.join(", ")}.`,
          severity: "warning",
          needsUserInput: true,
          itemIndex,
        });
      }
    });

    return flags;
  }

  /** Confirm blocked while any needsUserInput flag remains unresolved. */
  blockingFlags(flags: ValidationFlag[], data: IntelligentResumeData): ValidationFlag[] {
    return flags.filter((f) => {
      if (!f.needsUserInput) return false;
      if (f.section === "certifications" && f.itemIndex != null) {
        const cert = data.certifications[f.itemIndex];
        if (!cert) return false;
        const complete =
          Boolean(cert.issuer?.trim()) &&
          Boolean(cert.issueDate?.trim()) &&
          Boolean(cert.credentialId?.trim() || cert.credentialUrl?.trim());
        return !complete;
      }
      return true;
    });
  }
}

export const validationEngine = new ValidationEngine();
