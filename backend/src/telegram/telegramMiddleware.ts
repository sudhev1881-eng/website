/**
 * Shared Telegram middleware helpers (auth gate, permission checks).
 * Message pipeline uses these via telegramBot + telegramAuth.
 */

import type { TelegramAdminRecord, IntentName } from "./telegramTypes.js";
import { WRITE_INTENTS } from "./telegramTypes.js";
import { canWrite, permissionDeniedMessage, TelegramAuthError } from "./telegramAuth.js";

export function assertCanRunIntent(admin: TelegramAdminRecord, intent: IntentName): void {
  if (WRITE_INTENTS.has(intent) && !canWrite(admin)) {
    throw new TelegramAuthError(permissionDeniedMessage(admin), "unauthorized");
  }
}

export function isDestructiveIntent(intent: IntentName): boolean {
  return (
    intent === "delete_student" ||
    intent === "suspend_student" ||
    intent === "disable_nfc" ||
    intent === "bulk_import" ||
    intent === "change_college"
  );
}
