import { query } from "../db/pool.js";
import { logger } from "../config/logger.js";
import { downloadFile } from "../services/storage.js";
import { extractText } from "../services/pdf-extraction.service.js";
import { parseSkillsFromText } from "../services/skill-parser.service.js";

export interface ResumeProcessingJobData {
  resumeId: string;
  studentId: string;
  filePath: string;
}

export async function processResumeJob(data: ResumeProcessingJobData): Promise<void> {
  const { resumeId, studentId, filePath } = data;
  logger.info("Resume processing started", { resumeId, studentId });

  await query(
    `UPDATE resumes
     SET processing_status = 'processing', error_message = NULL, processed_at = NULL
     WHERE id = $1 AND student_id = $2`,
    [resumeId, studentId],
  );

  try {
    const buffer = await downloadFile(filePath);
    const rawText = await extractText(buffer);
    const parsed = parseSkillsFromText(rawText);

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
