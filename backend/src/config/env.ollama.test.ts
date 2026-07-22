import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getEnv, resetEnvCache } from "./env.js";

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "CORS_ORIGIN",
  "SITE_URL",
  "OLLAMA_BASE_URL",
] as const;

describe("OLLAMA_BASE_URL env fallback", () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of REQUIRED_KEYS) {
      snapshot[key] = process.env[key];
    }
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key-for-tests";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-for-tests";
    process.env.JWT_SECRET = "x".repeat(32);
    process.env.CORS_ORIGIN = "http://localhost:3000";
    process.env.SITE_URL = "http://localhost:3000";
    resetEnvCache();
  });

  afterEach(() => {
    for (const key of REQUIRED_KEYS) {
      const v = snapshot[key];
      if (v === undefined) delete process.env[key];
      else process.env[key] = v;
    }
    resetEnvCache();
  });

  it("falls back when unset", () => {
    delete process.env.OLLAMA_BASE_URL;
    assert.equal(getEnv().OLLAMA_BASE_URL, "http://127.0.0.1:11434");
  });

  it("falls back when empty or whitespace", () => {
    process.env.OLLAMA_BASE_URL = "   ";
    assert.equal(getEnv().OLLAMA_BASE_URL, "http://127.0.0.1:11434");
  });

  it("falls back when invalid (does not crash startup)", () => {
    process.env.OLLAMA_BASE_URL = "not-a-url";
    assert.equal(getEnv().OLLAMA_BASE_URL, "http://127.0.0.1:11434");
  });

  it("accepts a valid http(s) URL and strips trailing slash", () => {
    process.env.OLLAMA_BASE_URL = "https://ollama.example.com/";
    assert.equal(getEnv().OLLAMA_BASE_URL, "https://ollama.example.com");
  });
});
