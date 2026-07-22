# Intelligent Resume Pipeline

StudentLink processes one **active** resume per student. By default (`RESUME_REQUIRE_CONFIRMATION=false`), AI results **auto-apply** to the public profile. Set confirmation to `true` to keep the draft review UI.

See **[RESUME_AI_OLLAMA.md](./RESUME_AI_OLLAMA.md)** for Ollama setup, env vars, Render networking, and RAG search.

## Flow

```
Upload (PDF/DOCX)
  → staging path resumes/{studentId}/pending/...
  → draft row (is_draft=true, is_active=false)
  → async queue: extract → Ollama enhance (or heuristic fallback) → validate
  → RESUME_REQUIRE_CONFIRMATION=false:
        auto-confirm → profile tables + embeddings → confirmed
  → RESUME_REQUIRE_CONFIRMATION=true:
        awaiting_confirmation → user Accept/Edit/Delete
        → CONFIRM: replace active resume; apply accepted fields
        → REJECT: delete draft; keep active
```

Legacy `.doc` uploads are saved as drafts without text extraction (`awaiting_confirmation` with empty structured data).

## Modules

### AI layer (`backend/src/services/ai/`)

| Module | Role |
|--------|------|
| `ai-factory` | Picks Ollama or heuristic from env |
| `ollama.provider` | Chat + embeddings over HTTP |
| `prompts/*` | Extract / enhance / skill-infer / classify |
| `sanitize` | Prompt-injection hardening |

### Resume pipeline (`backend/src/services/resume/`)

| Module | Role |
|--------|------|
| `ResumeUploadService` | Stage pending file; replace existing draft only |
| `ResumeParser` | PDF/DOCX text + heuristic structured parse |
| `AiEnhancementEngine` | Ollama intelligence; heuristic fallback |
| `CertificationExtractor` | Rich cert schema |
| `SectionOptimizer` | Extra sections + light ATS cleanup |
| `ValidationEngine` | Flags (certs → `needsUserInput`) |
| `EmbeddingGenerator` | Ollama embeddings or `skipped_unavailable` |
| `ResumeVectorStore` | `resume_vectors` + legacy `resume_embeddings` |
| `hybridSearchService` | `semanticSearchStudents` for future RAG |
| `StorageManager` | Supabase delete helpers |
| `DatabaseManager` | Draft persistence + profile apply |
| `UserConfirmationService` | PATCH / confirm / reject / auto-apply |

## Migrations

- `010_intelligent_resume.sql` — drafts, confirmation, `resume_embeddings`
- `011_resume_ai_vectors.sql` — `resume_vectors` chunk store + provider metadata

## API

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/students/me/resume` | Returns quickly with `draftId` + status |
| `GET` | `/api/students/me/resumes` | Active + draft only |
| `GET` | `/api/students/me/resumes/ai-status` | Ollama reachable?, models, provider |
| `GET` | `/api/students/me/resumes/draft` | Current draft payload |
| `GET` | `/api/students/me/resumes/:id` | Status + stages + structured data |
| `PATCH` | `/api/students/me/resumes/:id/draft` | Edit / accept / delete / add custom |
| `POST` | `/api/students/me/resumes/:id/confirm` | Replace single resume |
| `POST` | `/api/students/me/resumes/:id/reject` | Discard draft |

Pipeline stages: `uploaded` → `extracting` → `enhancing` → `validating` → (`awaiting_confirmation` if confirm required) → `embedding` → `confirmed`.

## AI behavior

- Prefer Ollama (`RESUME_AI_PROVIDER=ollama`). If unreachable → heuristic parse; upload still works.
- Never invent employers, dates, credentials, or skills.
- Embeddings via `OLLAMA_EMBED_MODEL`; failure → `skipped_unavailable` (does **not** block confirm).

## Security gaps

- **Virus scanning:** no ClamAV. Upload uses MIME + extension filters and **magic-byte** validation (`verifyFileSignature`). PDF + DOCX (+ legacy DOC OLE2) only.
- **OCR:** free Tesseract.js for scanned PDFs when text extraction is too short (`RESUME_OCR_ENABLED`). Cap pages with `RESUME_OCR_MAX_PAGES` (default 5). CPU/RAM heavy on small hosts.
- Service-role Supabase storage; RLS revoked on extraction/embeddings/vectors tables for anon/authenticated.

## How to test

```bash
cd backend
npm run db:migrate          # applies 010 + 011
npm test
npm run lint                # tsc --noEmit
```

Manual:

1. Start Ollama; pull chat + embed models (see RESUME_AI_OLLAMA.md).
2. Upload PDF/DOCX on student Resume page → watch progress.
3. With auto-apply: profile sections fill; UI shows “Profile updated”.
4. With confirmation: review → confirm → one active resume.
5. Public `/u/[slug]` renders applied sections.
