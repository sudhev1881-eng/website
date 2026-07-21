import type { Bot } from "grammy";

/** Optional: set Telegram bot command menu suggestions. */
export async function registerBotCommands(bot: Bot): Promise<void> {
  await bot.api.setMyCommands([
    { command: "start", description: "Start / show help" },
    { command: "help", description: "List commands" },
    { command: "stats", description: "Platform statistics" },
    { command: "health", description: "API / DB / storage health" },
    { command: "find", description: "Find a student" },
    { command: "list", description: "List students [college]" },
    { command: "today", description: "Today's registrations" },
    { command: "inactive", description: "Inactive students" },
    { command: "create", description: "Create student" },
    { command: "nfc", description: "Generate NFC profile" },
    { command: "cancel", description: "Cancel pending action" },
  ]);
}
