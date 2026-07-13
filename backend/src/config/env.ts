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
  /** WebAuthn RP ID — hostname only, e.g. localhost or yourdomain.com */
  WEBAUTHN_RP_ID: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined)),
  /** WebAuthn expected origin — defaults to SITE_URL */
  WEBAUTHN_ORIGIN: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined)),
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

/** Hostname for WebAuthn RP ID (e.g. localhost or yourdomain.com). */
export function getWebAuthnRpId(): string {
  const env = getEnv();
  if (env.WEBAUTHN_RP_ID) return env.WEBAUTHN_RP_ID;
  try {
    return new URL(env.SITE_URL).hostname;
  } catch {
    return "localhost";
  }
}

/** Expected browser origin for WebAuthn (e.g. http://localhost:3000). */
export function getWebAuthnOrigin(): string {
  const env = getEnv();
  return (env.WEBAUTHN_ORIGIN ?? env.SITE_URL).replace(/\/$/, "");
}

export function resetEnvCache(): void {
  cached = null;
}
