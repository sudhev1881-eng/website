import { query, withTransaction } from "../../db/pool.js";
import { logger } from "../../config/logger.js";
import type {
  EmbeddingChunk,
  IntelligentResumeData,
  SectionDecisions,
  ValidationFlag,
} from "./types.js";
import { defaultSectionDecisions } from "./types.js";
import { toLegacyStructuredView } from "./schema-mapper.js";
import { planAcceptedProfile } from "./profile-builder.js";

/**
 * DatabaseManager / ProfileBuilder — draft persistence + profile apply.
 */
export class DatabaseManager {
  async setStage(
    resumeId: string,
    studentId: string,
    status: string,
    stage: string,
    errorMessage: string | null = null,
  ): Promise<void> {
    await query(
      `UPDATE resumes
       SET processing_status = $3,
           processing_stage = $4,
           error_message = $5,
           processed_at = CASE
             WHEN $3 IN ('awaiting_confirmation', 'completed', 'confirmed', 'failed', 'skipped', 'rejected')
             THEN NOW() ELSE processed_at END
       WHERE id = $1 AND student_id = $2`,
      [resumeId, studentId, status, stage, errorMessage],
    );
  }

  async saveDraftExtraction(params: {
    resumeId: string;
    rawText: string;
    rawExtracted: IntelligentResumeData;
    enhanced: IntelligentResumeData;
    confidence: number;
    validationFlags: ValidationFlag[];
  }): Promise<void> {
    const decisions = defaultSectionDecisions(params.enhanced);
    const legacyView = toLegacyStructuredView(params.enhanced);

    await query(
      `INSERT INTO extracted_resume_content (
         resume_id, raw_text, structured_data, extraction_confidence,
         raw_extracted, enhanced_data, validation_flags, section_decisions
       )
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb)
       ON CONFLICT (resume_id) DO UPDATE SET
         raw_text = EXCLUDED.raw_text,
         structured_data = EXCLUDED.structured_data,
         extraction_confidence = EXCLUDED.extraction_confidence,
         raw_extracted = EXCLUDED.raw_extracted,
         enhanced_data = EXCLUDED.enhanced_data,
         validation_flags = EXCLUDED.validation_flags,
         section_decisions = EXCLUDED.section_decisions,
         updated_at = NOW()`,
      [
        params.resumeId,
        params.rawText,
        JSON.stringify(legacyView),
        params.confidence,
        JSON.stringify(params.rawExtracted),
        JSON.stringify(params.enhanced),
        JSON.stringify(params.validationFlags),
        JSON.stringify(decisions),
      ],
    );
  }

  async getDraftPayload(resumeId: string, studentId: string) {
    const resume = await query<{
      id: string;
      file_name: string;
      file_size_bytes: number;
      file_path: string | null;
      version: number;
      is_active: boolean;
      is_draft: boolean;
      uploaded_at: Date;
      processing_status: string;
      processing_stage: string | null;
      error_message: string | null;
      processed_at: Date | null;
    }>(
      `SELECT id, file_name, file_size_bytes, file_path, version, is_active, is_draft,
              uploaded_at, processing_status, processing_stage, error_message, processed_at
       FROM resumes WHERE id = $1 AND student_id = $2`,
      [resumeId, studentId],
    );
    const row = resume.rows[0];
    if (!row) return null;

    const extracted = await query<{
      raw_text: string;
      structured_data: Record<string, unknown>;
      extraction_confidence: number | null;
      raw_extracted: IntelligentResumeData | null;
      enhanced_data: IntelligentResumeData | null;
      validation_flags: ValidationFlag[];
      section_decisions: SectionDecisions;
    }>(
      `SELECT raw_text, structured_data, extraction_confidence,
              raw_extracted, enhanced_data, validation_flags, section_decisions
       FROM extracted_resume_content WHERE resume_id = $1`,
      [resumeId],
    );

    return { resume: row, extracted: extracted.rows[0] ?? null };
  }

  async updateDraftSections(params: {
    resumeId: string;
    studentId: string;
    enhanced: IntelligentResumeData;
    decisions: SectionDecisions;
    validationFlags: ValidationFlag[];
  }): Promise<boolean> {
    const owned = await query(`SELECT id FROM resumes WHERE id = $1 AND student_id = $2 AND is_draft = TRUE`, [
      params.resumeId,
      params.studentId,
    ]);
    if (!owned.rowCount) return false;

    const legacyView = toLegacyStructuredView(params.enhanced);
    await query(
      `UPDATE extracted_resume_content SET
         structured_data = $2::jsonb,
         enhanced_data = $3::jsonb,
         section_decisions = $4::jsonb,
         validation_flags = $5::jsonb,
         updated_at = NOW()
       WHERE resume_id = $1`,
      [
        params.resumeId,
        JSON.stringify(legacyView),
        JSON.stringify(params.enhanced),
        JSON.stringify(params.decisions),
        JSON.stringify(params.validationFlags),
      ],
    );
    return true;
  }

  /**
   * Atomic replace: delete previous active resume (+ cascades), promote draft.
   * Returns storage paths that should be deleted after commit.
   */
  async confirmDraftReplace(params: {
    draftId: string;
    studentId: string;
  }): Promise<{ previousFilePaths: string[]; promotedResumeId: string }> {
    return withTransaction(async (tx) => {
      const draft = await tx<{
        id: string;
        file_path: string | null;
        is_draft: boolean;
      }>(
        `SELECT id, file_path, is_draft FROM resumes WHERE id = $1 AND student_id = $2 FOR UPDATE`,
        [params.draftId, params.studentId],
      );
      const d = draft.rows[0];
      if (!d || !d.is_draft) {
        throw new Error("Draft resume not found");
      }

      const previous = await tx<{ id: string; file_path: string | null }>(
        `SELECT id, file_path FROM resumes
         WHERE student_id = $1 AND is_draft = FALSE AND id <> $2
         FOR UPDATE`,
        [params.studentId, params.draftId],
      );

      const previousFilePaths = previous.rows.map((r) => r.file_path).filter(Boolean) as string[];

      // Delete embeddings for student (will recreate for new resume)
      await tx(`DELETE FROM resume_embeddings WHERE student_id = $1`, [params.studentId]);

      for (const old of previous.rows) {
        await tx(`DELETE FROM resumes WHERE id = $1`, [old.id]);
      }

      await tx(
        `UPDATE resumes SET
           is_draft = FALSE,
           is_active = TRUE,
           processing_status = 'confirmed',
           processing_stage = 'confirmed',
           error_message = NULL,
           processed_at = NOW()
         WHERE id = $1 AND student_id = $2`,
        [params.draftId, params.studentId],
      );

      return { previousFilePaths, promotedResumeId: params.draftId };
    });
  }

  /**
   * Write accepted enhanced resume sections into public profile tables.
   * Uses paraphrased/enhanced text the user confirmed — not raw extract.
   * Never writes email/phone onto the student row from resume contact.
   */
  async applyAcceptedProfile(params: {
    studentId: string;
    data: IntelligentResumeData;
    decisions: SectionDecisions;
  }): Promise<void> {
    const { studentId, data, decisions } = params;
    const plan = planAcceptedProfile(data, decisions);

    if (plan.applySkills && plan.skills.length > 0) {
      await this.upsertStudentSkills(
        studentId,
        plan.skills.map((s) => ({
          name: s.name,
          category: s.category,
          confidence: s.level / 100,
        })),
      );
    }

    if (plan.applyExperience && plan.experience.length > 0) {
      await this.replaceExperienceRows(studentId, plan.experience);
    }

    if (plan.applyProjects && plan.projects.length > 0) {
      await this.replaceProjectRows(studentId, plan.projects);
    }

    if (plan.applyCertificates && plan.certificates.length > 0) {
      await this.replaceCertificateRows(studentId, plan.certificates);
    }

    if (plan.applyLinks) {
      await this.fillEmptyPublicLinks(studentId, plan.links);
    }

    if (plan.applyBio && plan.bio) {
      // On confirm the user accepted the enhanced summary — write it for public About.
      await this.writeBio(studentId, plan.bio);
    }

    if (plan.applyTitle && plan.title) {
      await query(
        `UPDATE students SET title = COALESCE(NULLIF(TRIM(title), ''), $2), updated_at = NOW()
         WHERE id = $1 AND (title IS NULL OR TRIM(title) = '')`,
        [studentId, plan.title],
      );
    }

    if (plan.applyEducation && plan.education) {
      const { university, major } = plan.education;
      if (university || major) {
        await query(
          `UPDATE students SET
             university = CASE
               WHEN (university IS NULL OR TRIM(university) = '') AND $2::text IS NOT NULL THEN $2
               ELSE university END,
             major = CASE
               WHEN (major IS NULL OR TRIM(major) = '') AND $3::text IS NOT NULL THEN $3
               ELSE major END,
             updated_at = NOW()
           WHERE id = $1`,
          [studentId, university, major],
        );
      }
    }

    logger.info("Applied accepted enhanced resume sections to public profile", {
      studentId,
      skills: plan.applySkills,
      experience: plan.applyExperience,
      projects: plan.applyProjects,
      certificates: plan.applyCertificates,
      bio: plan.applyBio,
    });
  }

  async replaceEmbeddings(params: {
    studentId: string;
    resumeId: string;
    chunks: EmbeddingChunk[];
    status: string;
  }): Promise<void> {
    await query(
      `INSERT INTO resume_embeddings (student_id, resume_id, chunks, embedding_status, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (student_id) DO UPDATE SET
         resume_id = EXCLUDED.resume_id,
         chunks = EXCLUDED.chunks,
         embedding_status = EXCLUDED.embedding_status,
         updated_at = NOW()`,
      [params.studentId, params.resumeId, JSON.stringify(params.chunks), params.status],
    );
  }

  async deleteResumeRow(resumeId: string, studentId: string): Promise<string | null> {
    const row = await query<{ file_path: string | null }>(
      `DELETE FROM resumes WHERE id = $1 AND student_id = $2 RETURNING file_path`,
      [resumeId, studentId],
    );
    return row.rows[0]?.file_path ?? null;
  }

  private async upsertStudentSkills(
    studentId: string,
    skills: Array<{ name: string; category: string; confidence?: number; frequency?: number }>,
  ): Promise<void> {
    if (skills.length === 0) return;

    const existing = await query<{ id: string; name: string }>(
      `SELECT id, name FROM skills WHERE student_id = $1`,
      [studentId],
    );
    const byLower = new Map(existing.rows.map((r) => [r.name.trim().toLowerCase(), r]));
    const maxOrder = await query<{ max: number | null }>(
      `SELECT MAX(sort_order) AS max FROM skills WHERE student_id = $1`,
      [studentId],
    );
    let nextOrder = (maxOrder.rows[0]?.max ?? -1) + 1;

    for (const skill of skills) {
      const key = skill.name.trim().toLowerCase();
      if (!key) continue;
      const confidence = skill.confidence ?? Math.min(1, 0.5 + (skill.frequency ?? 1) * 0.05);
      const level = Math.max(20, Math.min(100, Math.round(confidence * 100)));
      const found = byLower.get(key);
      if (found) {
        await query(
          `UPDATE skills SET category = $2, level = GREATEST(level, $3) WHERE id = $1`,
          [found.id, skill.category || "General", level],
        );
      } else {
        await query(
          `INSERT INTO skills (student_id, name, level, category, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [studentId, skill.name.slice(0, 100), level, skill.category || "General", nextOrder++],
        );
        byLower.set(key, { id: "new", name: skill.name });
      }
    }
  }

  private async replaceExperienceRows(
    studentId: string,
    rows: Array<{ role: string; company: string; period: string; description: string }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await query(`DELETE FROM experience WHERE student_id = $1`, [studentId]);
    let order = 0;
    for (const exp of rows) {
      await query(
        `INSERT INTO experience (student_id, role, company, period, description, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [studentId, exp.role, exp.company, exp.period, exp.description, order++],
      );
    }
  }

  private async replaceProjectRows(
    studentId: string,
    rows: Array<{
      title: string;
      description: string;
      tech: string[];
      url: string;
      featured: boolean;
    }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await query(`DELETE FROM projects WHERE student_id = $1`, [studentId]);
    let order = 0;
    for (const p of rows) {
      await query(
        `INSERT INTO projects (student_id, title, description, tech, url, featured, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [studentId, p.title, p.description, p.tech, p.url, p.featured, order++],
      );
    }
  }

  private async replaceCertificateRows(
    studentId: string,
    rows: Array<{ name: string; issuer: string; date: string; url: string }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await query(`DELETE FROM certificates WHERE student_id = $1`, [studentId]);
    let order = 0;
    for (const c of rows) {
      await query(
        `INSERT INTO certificates (student_id, name, issuer, issued_date, url, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [studentId, c.name, c.issuer, c.date, c.url, order++],
      );
    }
  }

  /** Fill empty professional links only — never email or phone. */
  private async fillEmptyPublicLinks(
    studentId: string,
    links: {
      linkedin: string | null;
      github: string | null;
      portfolio: string | null;
      location: string | null;
    },
  ): Promise<void> {
    const row = await query<{
      linkedin: string | null;
      github: string | null;
      portfolio: string | null;
      location: string | null;
    }>(`SELECT linkedin, github, portfolio, location FROM students WHERE id = $1`, [studentId]);
    const student = row.rows[0];
    if (!student) return;

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    const empty = (v: string | null | undefined) => !v || !String(v).trim();

    if (links.linkedin && empty(student.linkedin)) {
      sets.push(`linkedin = $${i++}`);
      params.push(links.linkedin.slice(0, 500));
    }
    if (links.github && empty(student.github)) {
      sets.push(`github = $${i++}`);
      params.push(links.github.slice(0, 500));
    }
    if (links.portfolio && empty(student.portfolio)) {
      sets.push(`portfolio = $${i++}`);
      params.push(links.portfolio.slice(0, 500));
    }
    if (links.location && empty(student.location)) {
      sets.push(`location = $${i++}`);
      params.push(links.location.slice(0, 255));
    }

    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);
    params.push(studentId);
    await query(`UPDATE students SET ${sets.join(", ")} WHERE id = $${i}`, params);
    logger.info("Filled empty public professional links from confirmed resume", { studentId });
  }

  private async writeBio(studentId: string, summary: string): Promise<void> {
    await query(`UPDATE students SET bio = $2, updated_at = NOW() WHERE id = $1`, [
      studentId,
      summary.slice(0, 2000),
    ]);
  }
}

export const databaseManager = new DatabaseManager();

/** Pure helper for tests — which previous resumes would be removed on confirm. */
export function selectResumesToReplace(
  resumes: Array<{ id: string; is_draft: boolean; is_active: boolean }>,
  draftId: string,
): string[] {
  return resumes.filter((r) => r.id !== draftId && !r.is_draft).map((r) => r.id);
}
