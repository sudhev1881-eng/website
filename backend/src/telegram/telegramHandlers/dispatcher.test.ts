import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { helpText } from "../telegramHandlers/dispatcher.js";
import type { TelegramAdminRecord } from "../telegramTypes.js";

describe("handler smoke", () => {
  it("renders help for super admin", () => {
    const admin: TelegramAdminRecord = {
      id: "a1",
      telegramUserId: 42,
      userId: "u1",
      email: "admin@example.com",
      role: "admin",
      permissionLevel: "super_admin",
      collegeScope: null,
      displayName: "Admin",
      isActive: true,
    };
    const text = helpText(admin);
    assert.match(text, /StudentLink Admin Assistant/);
    assert.match(text, /super_admin/);
    assert.match(text, /\/create/);
    assert.match(text, /\/nfc/);
  });
});
