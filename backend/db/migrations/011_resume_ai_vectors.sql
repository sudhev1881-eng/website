-- Resume AI vectors (Ollama embeddings) + hybrid search readiness
-- Prefer pgvector when available; always keep JSONB embedding for portability.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available; resume_vectors uses JSONB embeddings';
END $$;

CREATE TABLE IF NOT EXISTS resume_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  section VARCHAR(64) NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE resume_vectors IS
  'Chunked resume embeddings for RAG (Ollama). One active set per student — replace on new confirm.';
COMMENT ON COLUMN resume_vectors.section IS
  'Logical section: full_resume | summary | experience | projects | skills | certifications | education | …';
COMMENT ON COLUMN resume_vectors.metadata IS
  '{ studentId, resumeId, section, tags, version, domain, … }';
COMMENT ON COLUMN resume_vectors.embedding IS
  'number[] vector as JSONB (REAL[] / pgvector-compatible)';

CREATE INDEX IF NOT EXISTS idx_resume_vectors_student_active
  ON resume_vectors (student_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_resume_vectors_resume_id
  ON resume_vectors (resume_id);

CREATE INDEX IF NOT EXISTS idx_resume_vectors_section
  ON resume_vectors (section);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_vectors_unique_chunk
  ON resume_vectors (student_id, resume_id, section, chunk_index)
  WHERE is_active = TRUE;

ALTER TABLE public.resume_vectors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.resume_vectors FROM anon, authenticated;

-- Optional metadata on legacy resume_embeddings for provider tracking
ALTER TABLE resume_embeddings
  ADD COLUMN IF NOT EXISTS provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS model VARCHAR(128);

COMMENT ON COLUMN resume_embeddings.provider IS 'ollama | heuristic | openai(deprecated) | null';
COMMENT ON COLUMN resume_embeddings.model IS 'Embedding model tag used for chunks';
