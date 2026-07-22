# Resume AI with Ollama

StudentLink resume intelligence uses **Ollama only** as the AI brain (not OpenAI). The heuristic structured parser remains the fallback when Ollama is unreachable.

## Architecture

```
backend/src/services/ai/
  types.ts                      # LLMProvider, EmbeddingProvider
  providers/ollama.provider.ts  # HTTP chat + embed
  providers/heuristic.provider.ts
  ai-factory.ts                 # RESUME_AI_PROVIDER → bundle
  sanitize.ts                   # prompt-injection hardening
  prompts/resume-extract.ts
  prompts/resume-enhance.ts
  prompts/skill-infer.ts
  prompts/classify.ts
```

Resume modules call `resolveResumeAiBundle()` — **no hardcoded model names** in callers (models come from env).

Pipeline (`services/resume/`):

1. Upload PDF/DOCX (magic-byte safe) → draft
2. Extract text → heuristic parse
3. Ollama: structured extract → skill infer → domain classify → wording enhance (no fabrication)
4. Validate → save draft
5. `RESUME_REQUIRE_CONFIRMATION=false` → **auto-confirm** (profile + embeddings)
6. `true` → existing review UI → confirm/reject

## Environment

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_CHAT_MODEL=qwen2.5:7b
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_TIMEOUT_MS=60000
RESUME_AI_PROVIDER=ollama          # ollama | heuristic
RESUME_REQUIRE_CONFIRMATION=false  # false = auto-apply; true = draft review UI
RESUME_PROCESSING_ENABLED=true
RESUME_OCR_ENABLED=true            # free Tesseract for scanned PDFs
RESUME_OCR_MAX_PAGES=5
```

`OPENAI_API_KEY` is **not** used for resume intelligence (optional Telegram NL only).

## Setup Ollama

```bash
# Install: https://ollama.com
ollama serve
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

Point the API at Ollama:

```bash
# backend/.env
OLLAMA_BASE_URL=http://127.0.0.1:11434
RESUME_AI_PROVIDER=ollama
RESUME_REQUIRE_CONFIRMATION=false
```

Run API + frontend locally, upload a PDF/DOCX on the student Resume page.

Check status:

```http
GET /api/students/me/resumes/ai-status
```

Returns `ollamaReachable`, model names, `requireConfirmation`, and whether the pipeline fell back to heuristics.

**Heuristic mode:** if Ollama is unreachable, the UI should show that AI is in heuristic fallback — embeddings/semantic search need Ollama; keyword admin search still works.

## Render / cloud networking

Ollama does **not** run in-process on Render’s free web service. Options:

1. Run the **API locally** beside Ollama (`OLLAMA_BASE_URL=http://127.0.0.1:11434`)
2. Host Ollama on a reachable machine/VPS and set `OLLAMA_BASE_URL` on Render
3. Expose a home PC via **Cloudflare Tunnel** or **ngrok** to `localhost:11434`, then set that HTTPS URL as `OLLAMA_BASE_URL` on Render
4. Set `RESUME_AI_PROVIDER=heuristic` or leave Ollama down — pipeline **gracefully falls back** to heuristics (upload still works)

### Cloudflare Tunnel checklist (free)

1. Install `cloudflared` and run `cloudflared tunnel --url http://127.0.0.1:11434` while `ollama serve` is running
2. Copy the `https://….trycloudflare.com` URL into Render env as `OLLAMA_BASE_URL` (no trailing slash)
3. Ensure models are pulled on that machine
4. Redeploy / restart the API; hit `GET /api/students/me/resumes/ai-status` until `ollamaReachable: true`

Health probes are cached ~30s to avoid hammering Ollama.

## Migration

`backend/db/migrations/011_resume_ai_vectors.sql`

- Table `resume_vectors` (student_id, resume_id, section, chunk_index, content, metadata JSONB, embedding JSONB)
- Unique active set per student (old rows deleted on replace)
- Optional `provider` / `model` on `resume_embeddings`

```bash
cd backend && npm run db:migrate
```

## Embeddings & RAG

Chunks: full resume, summary, experience, projects, skills, certifications (+ education).

Stored in `resume_vectors` + legacy `resume_embeddings.chunks`.

Hybrid search stub:

```ts
import { hybridSearchService } from "./services/resume/index.js";
await hybridSearchService.semanticSearchStudents("machine learning intern", {
  domains: ["AI", "Machine Learning"],
  limit: 10,
});
```

Uses Ollama embed + in-Node cosine similarity over JSONB vectors (demo-ready). Swap to pgvector `<=>` when the extension is available in production.

## Auto-apply vs confirmation

| `RESUME_REQUIRE_CONFIRMATION` | Behavior |
|-------------------------------|----------|
| `false` (default) | After AI success → auto-confirm → public profile tables updated → “Profile updated” in UI |
| `true` | Stops at `awaiting_confirmation` → existing Accept/Edit/Confirm UI |

Incomplete certifications do not block auto-apply (they do block manual confirm unless filled).

## Security

- Resume text sanitized; wrapped in `<<<RESUME_DOCUMENT_*>>>` delimiters
- System prompts: treat content as data only; never invent employers/dates/credentials
- Magic-byte upload validation unchanged

## Tests

```bash
cd backend
npm run lint    # tsc --noEmit
npm test        # includes mocked Ollama HTTP tests
```
