# Intelligent Resume Pipeline

StudentLink processes one **active** resume per student, with an optional **draft** awaiting confirmation.

## Flow

```
Upload (PDF/DOCX)
  → staging path resumes/{studentId}/pending/...
  → draft row (is_draft=true, is_active=false)
  → async queue: extract → enhance → validate
  → awaiting_confirmation
  → user Accept/Edit/Delete/Add sections
  → CONFIRM: delete previous active resume + storage + embeddings;
             promote draft; apply accepted profile fields
  → REJECT: delete draft + staging file; keep active
```

Legacy `.doc` uploads are saved as drafts without text extraction (`awaiting_confirmation` with empty structured data).

## Modules (`backend/src/services/resume/`)

| Module | Role |
|--------|------|
| `ResumeUploadService` | Stage pending file; replace existing draft only |
| `ResumeParser` | PDF/DOCX text + heuristic structured parse |
| `AiEnhancementEngine` | Optional OpenAI polish; no-op without key |
| `CertificationExtractor` | Rich cert schema |
| `SectionOptimizer` | Extra sections + light ATS cleanup |
| `ValidationEngine` | Flags (certs → `needsUserInput`) |
| `EmbeddingGenerator` | OpenAI embeddings or `skipped_no_key` |
| `StorageManager` | Supabase delete helpers |
| `DatabaseManager` | Draft persistence + profile apply |
| `UserConfirmationService` | PATCH / confirm / reject |

## Migration

`backend/db/migrations/010_intelligent_resume.sql`

- `resumes.is_draft`, `resumes.processing_stage`
- Partial unique indexes: one active non-draft; one draft per student
- `extracted_resume_content`: `raw_extracted`, `enhanced_data`, `validation_flags`, `section_decisions`
- `resume_embeddings` (JSONB chunks; optional `pgvector` extension if available)

## API

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/students/me/resume` | Returns quickly with `draftId` + status |
| `GET` | `/api/students/me/resumes` | Active + draft only |
| `GET` | `/api/students/me/resumes/draft` | Current draft payload |
| `GET` | `/api/students/me/resumes/:id` | Status + stages + structured data |
| `PATCH` | `/api/students/me/resumes/:id/draft` | Edit / accept / delete / add custom |
| `POST` | `/api/students/me/resumes/:id/confirm` | Replace single resume |
| `POST` | `/api/students/me/resumes/:id/reject` | Discard draft |

Pipeline stages: `uploaded` → `extracting` → `enhancing` → `validating` → `awaiting_confirmation` → (on confirm) `embedding` → `confirmed`.

## AI optional behavior

- No `OPENAI_API_KEY`: enhance skipped (`parser: heuristic`); confirmation still works.
- With key: polish grammar/ATS/readability only; **never invent** employers, dates, credentials, or skills.
- Embeddings: with key → store chunk vectors in `resume_embeddings.chunks`; without key → `embedding_status = skipped_no_key` (does **not** block confirm).

## Security gaps

- **Virus scanning:** no ClamAV. Upload uses MIME + extension filters and **magic-byte** validation (`verifyFileSignature`). PDF + DOCX (+ legacy DOC OLE2) only.
- Service-role Supabase storage; RLS revoked on extraction/embeddings tables for anon/authenticated.

## How to test

```bash
cd backend
npm run db:migrate          # applies 010_intelligent_resume.sql
npm test                    # includes resume-pipeline unit tests
npm run lint                # tsc --noEmit
```

Manual:

1. Upload PDF/DOCX on student Resume page → watch stage badges.
2. Review sections → fill incomplete cert issuer/date/credential if flagged.
3. Confirm → only one active resume; skills/experience applied for accepted sections.
4. Upload another → previous stays active until confirm; reject leaves it intact.
