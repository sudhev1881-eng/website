import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { resetEnvCache } from "../config/env.js";

function seedMinimalEnv(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string> = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://localhost/studentlink",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    JWT_SECRET: "x".repeat(32),
    CORS_ORIGIN: "http://localhost:3000",
    SITE_URL: "http://localhost:3000",
    TELEGRAM_ENABLED: "false",
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  resetEnvCache();
}

describe("startTelegramBot graceful disable", () => {
  before(() => {
    seedMinimalEnv();
  });

  it("does not start when TELEGRAM_ENABLED=false", async () => {
    seedMinimalEnv({ TELEGRAM_ENABLED: "false", TELEGRAM_BOT_TOKEN: undefined });
    const { startTelegramBot, getTelegramBot } = await import("./telegramBot.js");
    const result = await startTelegramBot();
    assert.equal(result.mode, "disabled");
    assert.equal(getTelegramBot(), null);
  });

  it("does not crash when enabled without token", async () => {
    seedMinimalEnv({ TELEGRAM_ENABLED: "true", TELEGRAM_BOT_TOKEN: undefined });
    const { startTelegramBot, getTelegramBot } = await import("./telegramBot.js");
    const result = await startTelegramBot();
    assert.equal(result.mode, "disabled");
    assert.match(result.reason ?? "", /TOKEN/);
    assert.equal(getTelegramBot(), null);
  });
});
