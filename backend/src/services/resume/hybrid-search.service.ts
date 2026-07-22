import { logger } from "../../config/logger.js";
import { resolveResumeAiBundle } from "../ai/index.js";
import { cosineSimilarity } from "./embedding-generator.js";
import { resumeVectorStore } from "./vector-store.js";

export interface SemanticSearchFilters {
  domains?: string[];
  sections?: string[];
  studentIds?: string[];
  /** Minimum cosine similarity (0–1). Default 0.35 */
  minScore?: number;
  limit?: number;
}

export interface SemanticSearchHit {
  studentId: string;
  resumeId: string;
  section: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  vectorId: string;
}

/**
 * Hybrid / semantic search stub for future RAG.
 * Implements real cosine similarity over stored JSONB vectors in Node.
 * Ready to swap to pgvector `<=>` when the extension is available in production.
 */
export interface HybridSearchService {
  semanticSearchStudents(
    query: string,
    filters?: SemanticSearchFilters,
  ): Promise<SemanticSearchHit[]>;
}

export class ResumeHybridSearchService implements HybridSearchService {
  async semanticSearchStudents(
    queryText: string,
    filters: SemanticSearchFilters = {},
  ): Promise<SemanticSearchHit[]> {
    const q = queryText.trim();
    if (!q) return [];

    const { bundle, fellBackToHeuristic } = await resolveResumeAiBundle();
    if (bundle.provider === "heuristic" || fellBackToHeuristic) {
      logger.info("semanticSearchStudents skipped — no embedding provider");
      return [];
    }

    let queryEmbedding: number[];
    try {
      const embedded = await bundle.embeddings.embed([q.slice(0, 2000)], { timeoutMs: 30_000 });
      queryEmbedding = embedded.embeddings[0] ?? [];
    } catch (err) {
      logger.warn("Query embedding failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      return [];
    }

    if (!queryEmbedding.length) return [];

    const rows = await resumeVectorStore.listActiveAll(8000);
    const minScore = filters.minScore ?? 0.35;
    const limit = filters.limit ?? 20;
    const domainSet = filters.domains?.map((d) => d.toLowerCase());
    const sectionSet = filters.sections?.map((s) => s.toLowerCase());
    const studentSet = filters.studentIds ? new Set(filters.studentIds) : null;

    const hits: SemanticSearchHit[] = [];
    for (const row of rows) {
      if (studentSet && !studentSet.has(row.studentId)) continue;
      if (sectionSet && !sectionSet.includes(row.section.toLowerCase())) continue;
      if (domainSet?.length) {
        const tags = [
          ...((row.metadata.domains as string[] | undefined) ?? []),
          ...((row.metadata.tags as string[] | undefined) ?? []),
        ].map((t) => String(t).toLowerCase());
        if (!domainSet.some((d) => tags.includes(d))) continue;
      }
      if (!row.embedding.length || row.embedding.length !== queryEmbedding.length) continue;

      const score = cosineSimilarity(queryEmbedding, row.embedding);
      if (score < minScore) continue;

      hits.push({
        studentId: row.studentId,
        resumeId: row.resumeId,
        section: row.section,
        content: row.content,
        score,
        metadata: row.metadata,
        vectorId: row.id,
      });
    }

    hits.sort((a, b) => b.score - a.score);

    // Deduplicate by student — keep best chunk per student for recruiter-style search
    const byStudent = new Map<string, SemanticSearchHit>();
    for (const hit of hits) {
      const prev = byStudent.get(hit.studentId);
      if (!prev || hit.score > prev.score) byStudent.set(hit.studentId, hit);
    }

    return [...byStudent.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export const hybridSearchService: HybridSearchService = new ResumeHybridSearchService();
