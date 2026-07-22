import { logger } from "../../config/logger.js";
import { resolveResumeAiBundle, type EmbeddingProvider } from "../ai/index.js";
import type { EmbeddingChunk, IntelligentResumeData, ResumeVectorRow } from "./types.js";

export type EmbeddingStatus =
  | "pending"
  | "completed"
  | "skipped_no_key"
  | "skipped_unavailable"
  | "failed";

export interface EmbeddingResult {
  status: EmbeddingStatus;
  chunks: EmbeddingChunk[];
  provider?: string;
  model?: string;
  /** Rows ready for resume_vectors table */
  vectorRows: Omit<ResumeVectorRow, "studentId" | "resumeId">[];
}

/**
 * EmbeddingGenerator — Ollama embeddings via AI factory.
 * Falls back to skipped_unavailable when Ollama is down (must not block confirm).
 */
export class EmbeddingGenerator {
  async generate(
    data: IntelligentResumeData,
    meta?: { studentId?: string; resumeId?: string; version?: number },
  ): Promise<EmbeddingResult> {
    const texts = this.buildChunks(data);
    if (texts.length === 0) {
      return { status: "skipped_unavailable", chunks: [], vectorRows: [] };
    }

    // Soft-fail everything (including env/provider resolution) so confirm never blocks.
    try {
      const { bundle, fellBackToHeuristic } = await resolveResumeAiBundle();
      if (bundle.provider === "heuristic" || fellBackToHeuristic) {
        return {
          status: "skipped_unavailable",
          chunks: [],
          vectorRows: [],
          provider: "heuristic",
        };
      }

      const embedded = await this.embedViaProvider(
        bundle.embeddings,
        texts.map((t) => t.text),
      );
      const chunks: EmbeddingChunk[] = texts.map((t, i) => ({
        sectionKey: t.sectionKey,
        text: t.text,
        embedding: embedded.embeddings[i] ?? [],
        metadata: {
          section: t.section,
          tags: t.tags,
          studentId: meta?.studentId,
          resumeId: meta?.resumeId,
          version: meta?.version,
          domains: data.domains,
        },
      }));

      const vectorRows = chunks
        .filter((c) => c.embedding.length > 0)
        .map((c, i) => ({
          section: String(c.metadata?.section ?? c.sectionKey.split(".")[0]),
          chunkIndex: i,
          content: c.text,
          metadata: c.metadata ?? {},
          embedding: c.embedding,
        }));

      return {
        status: "completed",
        chunks,
        provider: embedded.provider,
        model: embedded.model,
        vectorRows,
      };
    } catch (err) {
      logger.warn("Embedding generation failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      return { status: "skipped_unavailable", chunks: [], vectorRows: [] };
    }
  }

  buildChunks(data: IntelligentResumeData): Array<{
    sectionKey: string;
    section: string;
    text: string;
    tags: string[];
  }> {
    const out: Array<{ sectionKey: string; section: string; text: string; tags: string[] }> = [];
    const push = (sectionKey: string, section: string, text: string | null | undefined, tags: string[] = []) => {
      const t = text?.trim();
      if (t) out.push({ sectionKey, section, text: t.slice(0, 2000), tags });
    };

    const fullParts = [
      data.summary,
      data.objective,
      ...data.experience.map((e) => [e.title, e.company, ...e.bullets].filter(Boolean).join(" ")),
      ...data.projects.map((p) => [p.name, p.description].filter(Boolean).join(" ")),
      [...data.skills.all.map((s) => s.name)].join(", "),
    ].filter(Boolean);
    if (fullParts.length) {
      push("full_resume", "full_resume", fullParts.join("\n").slice(0, 4000), data.domains);
    }

    push("summary", "summary", data.summary, data.domains);
    push("objective", "objective", data.objective);

    data.experience.forEach((e, i) => {
      push(
        `experience.${i}`,
        "experience",
        [e.title, e.company, e.startDate, e.endDate, ...e.bullets].filter(Boolean).join(" | "),
        ["experience"],
      );
    });
    data.education.forEach((e, i) => {
      push(
        `education.${i}`,
        "education",
        [e.degree, e.field, e.school, e.endDate].filter(Boolean).join(" | "),
        ["education"],
      );
    });
    data.projects.forEach((p, i) => {
      push(
        `projects.${i}`,
        "projects",
        [p.name, p.description, ...(p.technologies ?? [])].filter(Boolean).join(" | "),
        ["projects", ...(p.technologies ?? []).slice(0, 5)],
      );
    });
    const skillNames = [
      ...data.skills.all.map((s) => s.name),
      ...data.skills.technical.map((s) => s.name),
      ...data.skills.soft.map((s) => s.name),
    ];
    if (skillNames.length) {
      push("skills", "skills", [...new Set(skillNames)].join(", "), ["skills"]);
    }
    data.certifications.forEach((c, i) => {
      push(
        `certifications.${i}`,
        "certifications",
        [c.name, c.issuer, c.issueDate].filter(Boolean).join(" | "),
        ["certifications"],
      );
    });

    return out.slice(0, 40);
  }

  protected async embedViaProvider(
    provider: EmbeddingProvider,
    texts: string[],
  ): Promise<{ embeddings: number[][]; model: string; provider: string }> {
    const result = await provider.embed(texts, { timeoutMs: 90_000 });
    return {
      embeddings: result.embeddings,
      model: result.model,
      provider: result.provider,
    };
  }
}

export const embeddingGenerator = new EmbeddingGenerator();

/** Cosine similarity for in-Node hybrid search demos. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
