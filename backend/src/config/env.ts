import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default("studentlink"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  CORS_ORIGIN: z.string().min(1),
  SITE_URL: z.string().url(),
  API_PUBLIC_URL: z.string().url().optional(),
  MAILERSEND_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined)),
  /** Verified sender, e.g. StudentLink <noreply@yourdomain.com> or noreply@yourdomain.com */
  MAILERSEND_FROM_EMAIL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined)),
  MAILERSEND_FROM_NAME: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined)),
  /** Inbox for admin alerts (registrations, NFC). Falls back to MAILERSEND_FROM_EMAIL. */
  ADMIN_NOTIFY_EMAIL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined))
    .pipe(z.string().email().optional()),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NFC_CLOUD_MODE: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  /** When false or unset, Telegram bot does not start. */
  TELEGRAM_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  TELEGRAM_BOT_TOKEN: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  /** Shared secret for webhook URL path / header verification. */
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  /** webhook (production/Render) or polling (local/dev). */
  TELEGRAM_MODE: z.enum(["webhook", "polling"]).optional(),
  TELEGRAM_WEBHOOK_PATH: z.string().default("/api/telegram/webhook"),
  /** Comma-separated Telegram user IDs allowed to bootstrap as super_admin. */
  TELEGRAM_SUPER_ADMIN_IDS: z
    .string()
    .optional()
    .transform((v) =>
      v && v.trim()
        ? v
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
            .map((id) => Number(id))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [],
    ),
  TELEGRAM_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  TELEGRAM_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  /** Optional — Telegram NL assist only. Resume intelligence uses Ollama (see RESUME_AI_PROVIDER). */
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  /** Ollama HTTP API — must be reachable from the API host (not in-process on Render free). */
  OLLAMA_BASE_URL: z
    .string()
    .optional()
    .transform((v) => {
      const fallback = "http://127.0.0.1:11434";
      if (!v?.trim()) return fallback;
      const trimmed = v.trim().replace(/\/$/, "");
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
        return trimmed;
      } catch {
        return fallback;
      }
    }),
  /** Chat / instruct model tag pulled into Ollama (e.g. qwen2.5:7b, llama3.1:8b). */
  OLLAMA_CHAT_MODEL: z.string().default("qwen2.5:7b"),
  /** Embedding model tag (e.g. nomic-embed-text). */
  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
  /** Resume AI brain: ollama (default) or heuristic-only. */
  RESUME_AI_PROVIDER: z
    .string()
    .optional()
    .transform((v) => {
      const n = (v ?? "ollama").trim().toLowerCase();
      return n === "heuristic" ? "heuristic" : "ollama";
    }),
  /**
   * When false (default): auto-apply extracted sections to the public profile after AI success.
   * When true: keep draft review / confirm UI.
   */
  RESUME_REQUIRE_CONFIRMATION: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return false;
      return v === "true" || v === "1";
    }),
  /** Optional Redis for BullMQ resume processing. Without it, jobs run in-process. */
  REDIS_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  REDIS_HOST: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  REDIS_PORT: z.coerce.number().int().positive().optional(),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  /** When false, skip enqueueing resume extraction jobs. Default true. */
  RESUME_PROCESSING_ENABLED: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return true;
      return v === "true" || v === "1";
    }),
  /** Free Tesseract OCR for scanned PDFs / Telegram images. Default true. Heavy on RAM. */
  RESUME_OCR_ENABLED: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return true;
      return v === "true" || v === "1";
    }),
  /** Max PDF pages to OCR (1–10). Default 5. */
  RESUME_OCR_MAX_PAGES: z.coerce.number().int().min(1).max(10).default(5),
  /** Ollama HTTP timeout for chat/embed (ms). */
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}
