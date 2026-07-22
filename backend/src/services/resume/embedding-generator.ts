import { logger } from "../../config/logger.js";
import type { EmbeddingChunk, IntelligentResumeData } from "./types.js";

export type EmbeddingStatus = "pending" | "completed" | "skipped_no_key" | "failed";

export interface EmbeddingResult {
  status: EmbeddingStatus;
  chunks: EmbeddingChunk[];
}

/**
 * EmbeddingGenerator — OpenAI embeddings when OPENAI_API_KEY is set.
 * Otherwise returns skipped_no_key (must not block profile confirm/save).
 * Provider-swappable via generateFromTexts override pattern.
 */
export class EmbeddingGenerator {
  async generate(data: IntelligentResumeData): Promise<EmbeddingResult> {
    const texts = this.buildChunks(data);
    if (texts.length === 0) {
      return { status: "skipped_no_key", chunks: [] };
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return { status: "skipped_no_key", chunks: [] };
    }

    try {
      const embeddings = await this.embedTexts(
        texts.map((t) => t.text),
        apiKey,
      );
      const chunks: EmbeddingChunk[] = texts.map((t, i) => ({
        sectionKey: t.sectionKey,
        text: t.text,
        embedding: embeddings[i] ?? [],
      }));
      return { status: "completed", chunks };
    } catch (err) {
      logger.warn("Embedding generation failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      return { status: "failed", chunks: [] };
    }
  }

  buildChunks(data: IntelligentResumeData): Array<{ sectionKey: string; text: string }> {
    const out: Array<{ sectionKey: string; text: string }> = [];
    const push = (sectionKey: string, text: string | null | undefined) => {
      const t = text?.trim();
      if (t) out.push({ sectionKey, text: t.slice(0, 2000) });
    };

    push("summary", data.summary);
    push("objective", data.objective);
    data.experience.forEach((e, i) => {
      push(
        `experience.${i}`,
        [e.title, e.company, e.startDate, e.endDate, ...e.bullets].filter(Boolean).join(" | "),
      );
    });
    data.education.forEach((e, i) => {
      push(`education.${i}`, [e.degree, e.field, e.school, e.endDate].filter(Boolean).join(" | "));
    });
    data.projects.forEach((p, i) => {
      push(
        `projects.${i}`,
        [p.name, p.description, ...(p.technologies ?? [])].filter(Boolean).join(" | "),
      );
    });
    const skillNames = [
      ...data.skills.all.map((s) => s.name),
      ...data.skills.technical.map((s) => s.name),
      ...data.skills.soft.map((s) => s.name),
    ];
    if (skillNames.length) push("skills", [...new Set(skillNames)].join(", "));
    data.certifications.forEach((c, i) => {
      push(`certifications.${i}`, [c.name, c.issuer, c.issueDate].filter(Boolean).join(" | "));
    });

    return out.slice(0, 32);
  }

  /** Swap provider by overriding / subclassing this method. */
  protected async embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
    const model = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: texts }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI embeddings HTTP ${res.status}`);
    }

    const body = (await res.json()) as {
      data?: Array<{ embedding: number[]; index: number }>;
    };
    const sorted = [...(body.data ?? [])].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }
}

export const embeddingGenerator = new EmbeddingGenerator();
