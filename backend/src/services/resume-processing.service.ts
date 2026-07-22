import { query } from "../db/pool.js";
import { logger } from "../config/logger.js";
import { downloadFile } from "../services/storage.js";
import { extractResumeText } from "../services/resume-text-extraction.service.js";
import {
  parseResumeStructured,
  type StructuredResumeData,
} from "../services/resume-structured-parser.service.js";

export interface ResumeProcessingJobData {
  resumeId: string;
  studentId: string;
  filePath: string;
  /** Original upload name — used when storage path extension is ambiguous. */
  fileName?: string;
}

export async function processResumeJob(data: ResumeProcessingJobData): Promise<void> {
  const { resumeId, studentId, filePath, fileName } = data;
  logger.info("Resume processing started", { resumeId, studentId });

  await query(
    `UPDATE resumes
     SET processing_status = 'processing', error_message = NULL, processed_at = NULL
     WHERE id = $1 AND student_id = $2`,
    [resumeId, studentId],
  );

  try {
    const buffer = await downloadFile(filePath);
    const rawText = await extractResumeText(buffer, fileName ?? filePath);
    const parsed = await parseResumeStructured(rawText);

    await query(
      `INSERT INTO extracted_resume_content (resume_id, raw_text, structured_data, extraction_confidence)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (resume_id) DO UPDATE SET
         raw_text = EXCLUDED.raw_text,
         structured_data = EXCLUDED.structured_data,
         extraction_confidence = EXCLUDED.extraction_confidence,
         updated_at = NOW()`,
      [resumeId, rawText, JSON.stringify(parsed.structuredData), parsed.extractionConfidence],
    );

    await upsertStudentSkills(studentId, parsed.skills);
    await maybeFillEmptyContactFields(studentId, parsed.structuredData);

    await query(
      `UPDATE resumes
       SET processing_status = 'completed', error_message = NULL, processed_at = NOW()
       WHERE id = $1 AND student_id = $2`,
      [resumeId, studentId],
    );

    logger.info("Resume processing completed", {
      resumeId,
      studentId,
      skillCount: parsed.skills.length,
      experienceCount: parsed.structuredData.experience.length,
      educationCount: parsed.structuredData.education.length,
      parser: parsed.structuredData.parser,
      confidence: parsed.extractionConfidence,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resume processing failed";
    logger.error("Resume processing failed", { resumeId, studentId, message });
    await query(
      `UPDATE resumes
       SET processing_status = 'failed', error_message = $3, processed_at = NOW()
       WHERE id = $1 AND student_id = $2`,
      [resumeId, studentId, message.slice(0, 1000)],
    );
    throw err;
  }
}

async function upsertStudentSkills(
  studentId: string,
  skills: Array<{ name: string; category: string; confidence: number }>,
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
    const level = Math.max(20, Math.min(100, Math.round(skill.confidence * 100)));
    const found = byLower.get(key);

    if (found) {
      await query(
        `UPDATE skills SET category = $2, level = GREATEST(level, $3) WHERE id = $1`,
        [found.id, skill.category, level],
      );
    } else {
      await query(
        `INSERT INTO skills (student_id, name, level, category, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [studentId, skill.name, level, skill.category, nextOrder++],
      );
      byLower.set(key, { id: "new", name: skill.name });
    }
  }
}

/**
 * Fill empty profile contact fields from extraction only — never overwrite user-edited data.
 */
async function maybeFillEmptyContactFields(
  studentId: string,
  data: StructuredResumeData,
): Promise<void> {
  const { contact } = data;
  const phone = contact.phones[0]?.trim() || null;
  const linkedin = contact.linkedin?.trim() || null;
  const github = contact.github?.trim() || null;
  const website = contact.website?.trim() || null;
  const location = contact.address?.trim() || null;

  if (!phone && !linkedin && !github && !website && !location) return;

  const row = await query<{
    phone: string | null;
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    location: string | null;
  }>(
    `SELECT phone, linkedin, github, portfolio, location FROM students WHERE id = $1`,
    [studentId],
  );
  const student = row.rows[0];
  if (!student) return;

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  const empty = (v: string | null | undefined) => !v || !String(v).trim();

  if (phone && empty(student.phone)) {
    sets.push(`phone = $${i++}`);
    params.push(phone.slice(0, 50));
  }
  if (linkedin && empty(student.linkedin)) {
    sets.push(`linkedin = $${i++}`);
    params.push(linkedin.slice(0, 500));
  }
  if (github && empty(student.github)) {
    sets.push(`github = $${i++}`);
    params.push(github.slice(0, 500));
  }
  if (website && empty(student.portfolio)) {
    sets.push(`portfolio = $${i++}`);
    params.push(website.slice(0, 500));
  }
  if (location && empty(student.location)) {
    sets.push(`location = $${i++}`);
    params.push(location.slice(0, 255));
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = NOW()`);
  params.push(studentId);
  await query(`UPDATE students SET ${sets.join(", ")} WHERE id = $${i}`, params);
  logger.info("Filled empty student contact fields from resume", {
    studentId,
    fields: sets.filter((s) => !s.startsWith("updated_at")).map((s) => s.split(" ")[0]),
  });
}
