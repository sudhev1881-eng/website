-- Intelligent Resume Upload & Processing
-- Draft → confirm single-resume policy, embeddings, expanded extraction metadata.
-- Virus scanning: magic-byte validation only (no ClamAV) — see docs/RESUME_PIPELINE.md.

-- Ensure at most one active non-draft resume before unique index
UPDATE resumes SET is_active = FALSE
WHERE is_active = TRUE
  AND id NOT IN (
    SELECT keep_id FROM (
      SELECT DISTINCT ON (student_id) id AS keep_id
      FROM resumes
      WHERE is_active = TRUE
      ORDER BY student_id, version DESC, uploaded_at DESC
    ) AS keepers
  );

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS processing_stage VARCHAR(64);

COMMENT ON COLUMN resumes.processing_stage IS
  'Pipeline stage: uploaded | extracting | enhancing | validating | awaiting_confirmation | embedding | confirmed | rejected | failed';

COMMENT ON COLUMN resumes.processing_status IS
  'Status: none | pending | processing | extracting | enhancing | validating | awaiting_confirmation | embedding | completed | confirmed | failed | skipped | rejected';

-- One active published resume per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_one_active_per_student
  ON resumes (student_id)
  WHERE is_active = TRUE AND is_draft = FALSE;

-- At most one draft resume per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_one_draft_per_student
  ON resumes (student_id)
  WHERE is_draft = TRUE;

CREATE INDEX IF NOT EXISTS idx_resumes_student_draft
  ON resumes (student_id, is_draft);

ALTER TABLE extracted_resume_content
  ADD COLUMN IF NOT EXISTS raw_extracted JSONB,
  ADD COLUMN IF NOT EXISTS enhanced_data JSONB,
  ADD COLUMN IF NOT EXISTS validation_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS section_decisions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN extracted_resume_content.raw_extracted IS
  'Heuristic parse before optional AI polish';
COMMENT ON COLUMN extracted_resume_content.enhanced_data IS
  'AI-polished (or pass-through) structured data shown for confirmation';
COMMENT ON COLUMN extracted_resume_content.validation_flags IS
  'Array of { code, section, message, severity, needsUserInput }';
COMMENT ON COLUMN extracted_resume_content.section_decisions IS
  'Per-section accept/edit/delete decisions from confirmation UI';

-- Prefer pgvector when available; embeddings still stored as JSONB for portability
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available; using JSONB embedding storage';
END $$;

CREATE TABLE IF NOT EXISTS resume_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  embedding_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN resume_embeddings.chunks IS
  '[{ sectionKey, text, embedding: number[] }] — REAL[]/vector-compatible JSON';
COMMENT ON COLUMN resume_embeddings.embedding_status IS
  'pending | completed | skipped_no_key | failed';

CREATE INDEX IF NOT EXISTS idx_resume_embeddings_resume_id ON resume_embeddings(resume_id);

ALTER TABLE public.resume_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.resume_embeddings FROM anon, authenticated;
