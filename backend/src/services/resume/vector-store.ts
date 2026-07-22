import { query } from "../../db/pool.js";
import { logger } from "../../config/logger.js";
import type { EmbeddingChunk, ResumeVectorRow } from "./types.js";

/**
 * Persist chunked resume vectors (resume_vectors) and legacy resume_embeddings blob.
 */
export class ResumeVectorStore {
  async replaceActiveVectors(params: {
    studentId: string;
    resumeId: string;
    rows: Array<Omit<ResumeVectorRow, "studentId" | "resumeId">>;
  }): Promise<void> {
    const { studentId, resumeId, rows } = params;

    // Deactivate previous active set for this student
    await query(
      `UPDATE resume_vectors SET is_active = FALSE, updated_at = NOW()
       WHERE student_id = $1 AND is_active = TRUE`,
      [studentId],
    );
    await query(`DELETE FROM resume_vectors WHERE student_id = $1`, [studentId]);

    for (const row of rows) {
      await query(
        `INSERT INTO resume_vectors (
           student_id, resume_id, section, chunk_index, content, metadata, embedding, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, TRUE)`,
        [
          studentId,
          resumeId,
          row.section.slice(0, 64),
          row.chunkIndex,
          row.content,
          JSON.stringify(row.metadata ?? {}),
          JSON.stringify(row.embedding),
        ],
      );
    }

    logger.info("Replaced resume_vectors", { studentId, resumeId, count: rows.length });
  }

  async replaceLegacyEmbeddings(params: {
    studentId: string;
    resumeId: string;
    chunks: EmbeddingChunk[];
    status: string;
    provider?: string;
    model?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO resume_embeddings (student_id, resume_id, chunks, embedding_status, provider, model, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, NOW())
       ON CONFLICT (student_id) DO UPDATE SET
         resume_id = EXCLUDED.resume_id,
         chunks = EXCLUDED.chunks,
         embedding_status = EXCLUDED.embedding_status,
         provider = EXCLUDED.provider,
         model = EXCLUDED.model,
         updated_at = NOW()`,
      [
        params.studentId,
        params.resumeId,
        JSON.stringify(params.chunks),
        params.status,
        params.provider ?? null,
        params.model ?? null,
      ],
    );
  }

  async listActiveForStudent(studentId: string): Promise<
    Array<{
      id: string;
      section: string;
      chunkIndex: number;
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[];
    }>
  > {
    const result = await query<{
      id: string;
      section: string;
      chunk_index: number;
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[] | string;
    }>(
      `SELECT id, section, chunk_index, content, metadata, embedding
       FROM resume_vectors
       WHERE student_id = $1 AND is_active = TRUE
       ORDER BY section, chunk_index`,
      [studentId],
    );

    return result.rows.map((r) => ({
      id: r.id,
      section: r.section,
      chunkIndex: r.chunk_index,
      content: r.content,
      metadata: r.metadata ?? {},
      embedding: parseEmbedding(r.embedding),
    }));
  }

  async listActiveAll(limit = 5000): Promise<
    Array<{
      id: string;
      studentId: string;
      resumeId: string;
      section: string;
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[];
    }>
  > {
    const result = await query<{
      id: string;
      student_id: string;
      resume_id: string;
      section: string;
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[] | string;
    }>(
      `SELECT id, student_id, resume_id, section, content, metadata, embedding
       FROM resume_vectors
       WHERE is_active = TRUE
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      resumeId: r.resume_id,
      section: r.section,
      content: r.content,
      metadata: r.metadata ?? {},
      embedding: parseEmbedding(r.embedding),
    }));
  }
}

function parseEmbedding(raw: number[] | string): number[] {
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export const resumeVectorStore = new ResumeVectorStore();
