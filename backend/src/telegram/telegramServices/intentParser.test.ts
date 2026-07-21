import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseIntent, isConfirmText, isCancelText } from "../telegramServices/intentParser.js";
import { parseDelimitedText } from "../telegramServices/importService.js";
import { TelegramRateLimiter } from "../telegramUtils/rateLimit.js";
import { escapeHtml, formatStudentCreated } from "../telegramUtils/format.js";
import { assertCanRunIntent, isDestructiveIntent } from "../telegramMiddleware.js";
import { TelegramAuthError } from "../telegramAuth.js";
import type { TelegramAdminRecord } from "../telegramTypes.js";

describe("parseIntent", () => {
  it("parses /create command with CSV-like args", () => {
    const parsed = parseIntent("/create Jane Doe, jane@mit.edu, MIT");
    assert.equal(parsed.intent, "create_student");
    assert.equal(parsed.args.name, "Jane Doe");
    assert.equal(parsed.args.email, "jane@mit.edu");
    assert.equal(parsed.args.college, "MIT");
    assert.equal(parsed.source, "command");
  });

  it("parses natural language find", () => {
    const parsed = parseIntent("find jane@mit.edu");
    assert.equal(parsed.intent, "find_student");
    assert.equal(parsed.args.query, "jane@mit.edu");
  });

  it("parses stats and health", () => {
    assert.equal(parseIntent("/stats").intent, "stats");
    assert.equal(parseIntent("show system health").intent, "health");
  });

  it("detects bulk paste blocks", () => {
    const parsed = parseIntent("Alice, a@x.com, MIT\nBob, b@x.com, MIT");
    assert.equal(parsed.intent, "bulk_import");
    assert.ok(parsed.args.payload?.includes("Alice"));
  });

  it("parses NFC generate", () => {
    const parsed = parseIntent("generate nfc for jane@mit.edu");
    assert.equal(parsed.intent, "generate_nfc");
    assert.equal(parsed.args.query, "jane@mit.edu");
  });

  it("parses confirm / cancel", () => {
    assert.equal(parseIntent("YES").intent, "confirm");
    assert.equal(parseIntent("cancel").intent, "cancel");
    assert.equal(isConfirmText("yes"), true);
    assert.equal(isCancelText("ABORT"), true);
  });
});

describe("parseDelimitedText", () => {
  it("parses headered CSV", () => {
    const result = parseDelimitedText("Name,Email,College\nJane,jane@x.com,MIT\nBob,bob@x.com,Stanford");
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].name, "Jane");
    assert.equal(result.rows[0].email, "jane@x.com");
    assert.equal(result.rows[1].college, "Stanford");
  });

  it("parses positional rows", () => {
    const result = parseDelimitedText("Jane Doe, jane@x.com, MIT");
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].name, "Jane Doe");
  });
});

describe("TelegramRateLimiter", () => {
  it("allows up to max then blocks", () => {
    const limiter = new TelegramRateLimiter(2, 60_000);
    assert.equal(limiter.allow(1, 1000), true);
    assert.equal(limiter.allow(1, 1001), true);
    assert.equal(limiter.allow(1, 1002), false);
    assert.equal(limiter.allow(2, 1002), true);
  });
});

describe("format helpers", () => {
  it("escapes HTML", () => {
    assert.equal(escapeHtml("<b>&"), "&lt;b&gt;&amp;");
  });

  it("formats student created message", async () => {
    process.env.SITE_URL = "http://localhost:3000";
    process.env.DATABASE_URL = "postgresql://localhost/studentlink";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    process.env.JWT_SECRET = "x".repeat(32);
    process.env.CORS_ORIGIN = "http://localhost:3000";
    const { resetEnvCache } = await import("../../config/env.js");
    resetEnvCache();

    const msg = formatStudentCreated({
      name: "Jane",
      email: "jane@x.com",
      university: "MIT",
      id: "11111111-1111-1111-1111-111111111111",
      username: "jane",
    });
    assert.match(msg, /Student Created/);
    assert.match(msg, /jane@x.com/);
  });
});

describe("permission middleware", () => {
  const readOnly: TelegramAdminRecord = {
    id: "a",
    telegramUserId: 1,
    userId: "u",
    email: "a@x.com",
    role: "admin",
    permissionLevel: "read_only",
    collegeScope: null,
    displayName: null,
    isActive: true,
  };

  it("blocks write intents for read_only", () => {
    assert.throws(
      () => assertCanRunIntent(readOnly, "delete_student"),
      (err: unknown) => err instanceof TelegramAuthError,
    );
  });

  it("allows read intents", () => {
    assert.doesNotThrow(() => assertCanRunIntent(readOnly, "stats"));
  });

  it("flags destructive intents", () => {
    assert.equal(isDestructiveIntent("delete_student"), true);
    assert.equal(isDestructiveIntent("find_student"), false);
  });
});
