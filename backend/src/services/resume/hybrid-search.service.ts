import { query } from "../../db/pool.js";
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
  /** How the hit was produced */
  source: "vector" | "keyword" | "hybrid";
}

/** Enriched card for admin / recruiter UI */
export interface AdminSearchResult {
  studentId: string;
  name: string;
  username: string;
  email: string | null;
  university: string | null;
  major: string | null;
  status: string;
  profileUrl: string;
  score: number;
  source: "vector" | "keyword" | "hybrid";
  matchedSection: string;
  snippet: string;
}

/**
 * Hybrid search: semantic vectors when Ollama embeddings work, plus always-on
 * structured ILIKE fallback so results work without Ollama.
 */
export interface HybridSearchService {
  semanticSearchStudents(
    query: string,
    filters?: SemanticSearchFilters,
  ): Promise<SemanticSearchHit[]>;
  searchStudentsForAdmin(
    query: string,
    filters?: SemanticSearchFilters,
  ): Promise<AdminSearchResult[]>;
}

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, "\\$&");
}

/** Score keyword matches roughly 0.4–0.85 based on where they hit. */
function keywordBaseScore(where: "identity" | "skill" | "project" | "experience" | "resume"): number {
  switch (where) {
    case "identity":
      return 0.82;
    case "skill":
      return 0.75;
    case "project":
      return 0.68;
    case "experience":
      return 0.62;
    case "resume":
      return 0.55;
    default:
      return 0.5;
  }
}

async function keywordSearchStudents(
  queryText: string,
  limit: number,
  studentSet: Set<string> | null,
): Promise<SemanticSearchHit[]> {
  const pattern = `%${escapeIlike(queryText)}%`;
  const hits: SemanticSearchHit[] = [];

  const identity = await query<{
    id: string;
    name: string;
    username: string;
    email: string | null;
    university: string | null;
    major: string | null;
  }>(
    `SELECT s.id, s.name, s.username, u.email, s.university, s.major
     FROM students s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.name ILIKE $1 ESCAPE '\\'
        OR s.username ILIKE $1 ESCAPE '\\'
        OR s.university ILIKE $1 ESCAPE '\\'
        OR s.major ILIKE $1 ESCAPE '\\'
        OR COALESCE(u.email, '') ILIKE $1 ESCAPE '\\'
        OR COALESCE(s.bio, '') ILIKE $1 ESCAPE '\\'
     LIMIT 50`,
    [pattern],
  );

  for (const row of identity.rows) {
    if (studentSet && !studentSet.has(row.id)) continue;
    const snippet = [row.name, row.major, row.university].filter(Boolean).join(" · ");
    hits.push({
      studentId: row.id,
      resumeId: "",
      section: "profile",
      content: snippet,
      score: keywordBaseScore("identity"),
      metadata: { name: row.name, username: row.username },
      vectorId: `kw-identity-${row.id}`,
      source: "keyword",
    });
  }

  const skills = await query<{ student_id: string; name: string }>(
    `SELECT DISTINCT ON (student_id) student_id, name
     FROM skills
     WHERE name ILIKE $1 ESCAPE '\\'
     ORDER BY student_id, name
     LIMIT 80`,
    [pattern],
  );
  for (const row of skills.rows) {
    if (studentSet && !studentSet.has(row.student_id)) continue;
    hits.push({
      studentId: row.student_id,
      resumeId: "",
      section: "skills",
      content: row.name,
      score: keywordBaseScore("skill"),
      metadata: {},
      vectorId: `kw-skill-${row.student_id}-${row.name}`,
      source: "keyword",
    });
  }

  const projects = await query<{ student_id: string; title: string; description: string | null }>(
    `SELECT DISTINCT ON (student_id) student_id, title, description
     FROM projects
     WHERE title ILIKE $1 ESCAPE '\\'
        OR COALESCE(description, '') ILIKE $1 ESCAPE '\\'
     ORDER BY student_id, title
     LIMIT 80`,
    [pattern],
  );
  for (const row of projects.rows) {
    if (studentSet && !studentSet.has(row.student_id)) continue;
    hits.push({
      studentId: row.student_id,
      resumeId: "",
      section: "projects",
      content: `${row.title}${row.description ? `: ${row.description.slice(0, 160)}` : ""}`,
      score: keywordBaseScore("project"),
      metadata: {},
      vectorId: `kw-project-${row.student_id}`,
      source: "keyword",
    });
  }

  const experience = await query<{
    student_id: string;
    company: string;
    role: string;
  }>(
    `SELECT DISTINCT ON (student_id) student_id, company, role
     FROM experience
     WHERE company ILIKE $1 ESCAPE '\\'
        OR role ILIKE $1 ESCAPE '\\'
        OR COALESCE(description, '') ILIKE $1 ESCAPE '\\'
     ORDER BY student_id, company
     LIMIT 80`,
    [pattern],
  );
  for (const row of experience.rows) {
    if (studentSet && !studentSet.has(row.student_id)) continue;
    hits.push({
      studentId: row.student_id,
      resumeId: "",
      section: "experience",
      content: `${row.role} @ ${row.company}`,
      score: keywordBaseScore("experience"),
      metadata: {},
      vectorId: `kw-exp-${row.student_id}`,
      source: "keyword",
    });
  }

  const resumes = await query<{
    student_id: string;
    resume_id: string;
    snippet: string;
  }>(
    `SELECT r.student_id, r.id AS resume_id,
            LEFT(COALESCE(e.raw_text, ''), 240) AS snippet
     FROM resumes r
     LEFT JOIN extracted_resume_content e ON e.resume_id = r.id
     WHERE r.is_active = TRUE
       AND COALESCE(r.is_draft, FALSE) = FALSE
       AND (
         COALESCE(e.raw_text, '') ILIKE $1 ESCAPE '\\'
         OR COALESCE(e.structured_data::text, '') ILIKE $1 ESCAPE '\\'
         OR COALESCE(e.enhanced_data::text, '') ILIKE $1 ESCAPE '\\'
       )
     LIMIT 40`,
    [pattern],
  );
  for (const row of resumes.rows) {
    if (studentSet && !studentSet.has(row.student_id)) continue;
    hits.push({
      studentId: row.student_id,
      resumeId: row.resume_id,
      section: "resume",
      content: row.snippet || queryText,
      score: keywordBaseScore("resume"),
      metadata: {},
      vectorId: `kw-resume-${row.resume_id}`,
      source: "keyword",
    });
  }

  // Deduplicate by student — keep best keyword hit
  const byStudent = new Map<string, SemanticSearchHit>();
  for (const hit of hits) {
    const prev = byStudent.get(hit.studentId);
    if (!prev || hit.score > prev.score) byStudent.set(hit.studentId, hit);
  }

  return [...byStudent.values()].sort((a, b) => b.score - a.score).slice(0, limit * 2);
}

async function vectorSearchStudents(
  queryText: string,
  filters: SemanticSearchFilters,
): Promise<SemanticSearchHit[]> {
  const { bundle, fellBackToHeuristic } = await resolveResumeAiBundle();
  if (bundle.provider === "heuristic" || fellBackToHeuristic) {
    logger.info("vectorSearchStudents skipped — no embedding provider");
    return [];
  }

  let queryEmbedding: number[];
  try {
    const embedded = await bundle.embeddings.embed([queryText.slice(0, 2000)], {
      timeoutMs: 30_000,
    });
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
      source: "vector",
    });
  }

  hits.sort((a, b) => b.score - a.score);

  const byStudent = new Map<string, SemanticSearchHit>();
  for (const hit of hits) {
    const prev = byStudent.get(hit.studentId);
    if (!prev || hit.score > prev.score) byStudent.set(hit.studentId, hit);
  }

  return [...byStudent.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

function mergeHits(
  vectorHits: SemanticSearchHit[],
  keywordHits: SemanticSearchHit[],
  limit: number,
): SemanticSearchHit[] {
  const byStudent = new Map<string, SemanticSearchHit>();

  for (const hit of [...vectorHits, ...keywordHits]) {
    const prev = byStudent.get(hit.studentId);
    if (!prev) {
      byStudent.set(hit.studentId, hit);
      continue;
    }
    if (prev.source !== hit.source) {
      const merged: SemanticSearchHit = {
        ...prev,
        score: Math.min(0.99, Math.max(prev.score, hit.score) + 0.08),
        source: "hybrid",
        content: prev.score >= hit.score ? prev.content : hit.content,
        section: prev.score >= hit.score ? prev.section : hit.section,
      };
      byStudent.set(hit.studentId, merged);
    } else if (hit.score > prev.score) {
      byStudent.set(hit.studentId, hit);
    }
  }

  return [...byStudent.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export class ResumeHybridSearchService implements HybridSearchService {
  async semanticSearchStudents(
    queryText: string,
    filters: SemanticSearchFilters = {},
  ): Promise<SemanticSearchHit[]> {
    const q = queryText.trim();
    if (!q) return [];

    const limit = filters.limit ?? 20;
    const studentSet = filters.studentIds ? new Set(filters.studentIds) : null;

    const [vectorHits, keywordHits] = await Promise.all([
      vectorSearchStudents(q, filters),
      keywordSearchStudents(q, limit, studentSet),
    ]);

    return mergeHits(vectorHits, keywordHits, limit);
  }

  async searchStudentsForAdmin(
    queryText: string,
    filters: SemanticSearchFilters = {},
  ): Promise<AdminSearchResult[]> {
    const hits = await this.semanticSearchStudents(queryText, filters);
    if (!hits.length) return [];

    const ids = hits.map((h) => h.studentId);
    const students = await query<{
      id: string;
      name: string;
      username: string;
      email: string | null;
      university: string | null;
      major: string | null;
      status: string;
      user_id: string | null;
    }>(
      `SELECT s.id, s.name, s.username, u.email, s.university, s.major, s.status, s.user_id
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ANY($1::uuid[])`,
      [ids],
    );

    const byId = new Map(students.rows.map((r) => [r.id, r]));

    return hits
      .map((hit) => {
        const s = byId.get(hit.studentId);
        if (!s) return null;
        return {
          studentId: s.id,
          name: s.name,
          username: s.username,
          email: s.email,
          university: s.university,
          major: s.major,
          status: s.user_id ? s.status : "unclaimed",
          profileUrl: `/u/${s.username}`,
          score: Math.round(hit.score * 1000) / 1000,
          source: hit.source,
          matchedSection: hit.section,
          snippet: hit.content.slice(0, 280),
        } satisfies AdminSearchResult;
      })
      .filter((r): r is AdminSearchResult => r !== null);
  }
}

export const hybridSearchService: HybridSearchService = new ResumeHybridSearchService();

/** Pure helpers exported for unit tests */
export const _hybridSearchTest = {
  mergeHits,
  keywordBaseScore,
  escapeIlike,
};
