import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { enqueueResumeProcessing } from "./resume-processing.queue.js";
import { resetEnvCache } from "../config/env.js";

const ENV_KEYS = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "CORS_ORIGIN",
  "SITE_URL",
  "RESUME_PROCESSING_ENABLED",
] as const;

const previous: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function setRequiredEnv() {
  for (const key of ENV_KEYS) previous[key] = process.env[key];
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db";
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon-key-for-tests";
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key-for-tests";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(32);
  process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
  process.env.SITE_URL = process.env.SITE_URL || "http://localhost:3000";
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetEnvCache();
});

describe("enqueueResumeProcessing", () => {
  it("reports disabled processing without scheduling a stuck pending job", async () => {
    setRequiredEnv();
    process.env.RESUME_PROCESSING_ENABLED = "false";
    resetEnvCache();

    const result = await enqueueResumeProcessing({
      resumeId: "resume-1",
      studentId: "student-1",
      filePath: "resumes/student-1/pending/resume.pdf",
      fileName: "resume.pdf",
    });

    assert.deepEqual(result, {
      scheduled: false,
      mode: "disabled",
      reason: "processing_disabled",
    });
  });
});
