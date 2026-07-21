import { Bot, type Context } from "grammy";
import type { Update } from "grammy/types";
import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";
import { authenticateTelegramUser, TelegramAuthError } from "./telegramAuth.js";
import { resolveIntent } from "./telegramServices/aiParser.js";
import {
  getOrCreateSession,
  logCommand,
  logResult,
} from "./telegramServices/auditService.js";
import { handleFileImport, handleIntent, helpText } from "./telegramHandlers/dispatcher.js";
import { isCancelText, isConfirmText } from "./telegramServices/intentParser.js";
import { TelegramRateLimiter } from "./telegramUtils/rateLimit.js";
import { formatError, truncate } from "./telegramUtils/format.js";

let botSingleton: Bot | null = null;
let rateLimiter: TelegramRateLimiter | null = null;
let currentRequestIp: string | null = null;

function getLimiter(): TelegramRateLimiter {
  if (!rateLimiter) {
    const env = getEnv();
    rateLimiter = new TelegramRateLimiter(
      env.TELEGRAM_RATE_LIMIT_MAX,
      env.TELEGRAM_RATE_LIMIT_WINDOW_MS,
    );
  }
  return rateLimiter;
}

async function downloadTelegramFile(bot: Bot, fileId: string): Promise<Buffer> {
  const file = await bot.api.getFile(fileId);
  if (!file.file_path) throw new Error("Could not resolve Telegram file path");
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function processAuthorizedMessage(
  bot: Bot,
  ctx: Context,
  ipAddress?: string | null,
): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  const telegramUserId = from.id;
  const displayName =
    [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username;

  if (!getLimiter().allow(telegramUserId)) {
    await ctx.reply("⏳ Rate limit exceeded. Please wait a minute and try again.");
    await logResult({
      telegramUserId,
      adminId: null,
      command: "rate_limit",
      result: "denied",
      ipAddress,
    });
    return;
  }

  let admin;
  try {
    admin = await authenticateTelegramUser(telegramUserId, displayName);
  } catch (err) {
    if (err instanceof TelegramAuthError) {
      await ctx.reply("❌ Unauthorized. This bot is for StudentLink admins only.");
      await logResult({
        telegramUserId,
        adminId: null,
        command: "auth",
        result: "unauthorized",
        error: err.message,
        ipAddress,
      });
      logger.warn("Telegram unauthorized attempt", { telegramUserId, code: err.code });
      return;
    }
    throw err;
  }

  await getOrCreateSession(telegramUserId, admin.id);

  const doc = ctx.message?.document;
  if (doc) {
    try {
      const buffer = await downloadTelegramFile(bot, doc.file_id);
      const reply = await handleFileImport(
        { admin, telegramUserId, ipAddress, text: doc.file_name ?? "file" },
        doc.file_name ?? "upload.bin",
        buffer,
      );
      await ctx.reply(truncate(reply), { parse_mode: "HTML" });
      await logResult({
        telegramUserId,
        adminId: admin.id,
        command: "file_import",
        result: "ok",
        ipAddress,
        meta: { filename: doc.file_name },
      });
    } catch (err) {
      const message = (err as Error).message;
      await ctx.reply(formatError(message), { parse_mode: "HTML" });
      await logResult({
        telegramUserId,
        adminId: admin.id,
        command: "file_import",
        result: "error",
        error: message,
        ipAddress,
      });
    }
    return;
  }

  const text = ctx.message?.text?.trim() ?? ctx.message?.caption?.trim() ?? "";
  if (!text) {
    await ctx.reply(helpText(admin), { parse_mode: "HTML" });
    return;
  }

  let intent = await resolveIntent(text);
  if (isConfirmText(text)) {
    intent = { ...intent, intent: "confirm", confidence: 1, source: "pattern" };
  }
  if (isCancelText(text)) {
    intent = { ...intent, intent: "cancel", confidence: 1, source: "pattern" };
  }

  await logCommand({
    telegramUserId,
    adminId: admin.id,
    rawText: text,
    parsedIntent: intent.intent,
    parsedArgs: intent.args,
  });

  try {
    const reply = await handleIntent({ admin, telegramUserId, ipAddress, text }, intent);
    await ctx.reply(truncate(reply), { parse_mode: "HTML" });
    await logResult({
      telegramUserId,
      adminId: admin.id,
      command: intent.intent,
      result: "ok",
      ipAddress,
    });
  } catch (err) {
    const message =
      err instanceof TelegramAuthError ? err.message : (err as Error).message || "Request failed";
    await ctx.reply(formatError(message), { parse_mode: "HTML" });
    await logResult({
      telegramUserId,
      adminId: admin.id,
      command: intent.intent,
      result: err instanceof TelegramAuthError ? "denied" : "error",
      error: message,
      ipAddress,
    });
  }
}

function createBot(token: string): Bot {
  const bot = new Bot(token);

  bot.catch((err) => {
    logger.error("Telegram bot error", {
      message: err.error instanceof Error ? err.error.message : String(err.error),
    });
  });

  const run = async (ctx: Context) => {
    await processAuthorizedMessage(bot, ctx, currentRequestIp);
  };

  bot.command("start", run);
  bot.on("message", async (ctx) => {
    if (ctx.message?.text?.startsWith("/start")) return;
    await run(ctx);
  });

  return bot;
}

export function getTelegramBot(): Bot | null {
  return botSingleton;
}

export async function processTelegramUpdate(
  update: Update,
  ipAddress?: string | null,
): Promise<void> {
  if (!botSingleton) return;
  const previous = currentRequestIp;
  currentRequestIp = ipAddress ?? null;
  try {
    await botSingleton.handleUpdate(update);
  } finally {
    currentRequestIp = previous;
  }
}

export async function startTelegramBot(): Promise<{
  mode: "webhook" | "polling" | "disabled";
  reason?: string;
}> {
  const env = getEnv();

  if (!env.TELEGRAM_ENABLED) {
    logger.info("Telegram bot disabled (TELEGRAM_ENABLED is not true)");
    return { mode: "disabled", reason: "TELEGRAM_ENABLED=false" };
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn("Telegram enabled but TELEGRAM_BOT_TOKEN missing — bot not started");
    return { mode: "disabled", reason: "TELEGRAM_BOT_TOKEN missing" };
  }

  botSingleton = createBot(env.TELEGRAM_BOT_TOKEN);

  const mode =
    env.TELEGRAM_MODE ?? (env.NODE_ENV === "production" ? "webhook" : "polling");

  if (mode === "polling") {
    try {
      await botSingleton.api.deleteWebhook({ drop_pending_updates: false });
    } catch (err) {
      logger.warn("deleteWebhook failed", { message: (err as Error).message });
    }
    void botSingleton.start({
      onStart: (info) =>
        logger.info("Telegram bot polling started", { username: info.username }),
    });
    return { mode: "polling" };
  }

  const publicUrl = env.API_PUBLIC_URL?.replace(/\/$/, "");
  if (publicUrl) {
    const secret = env.TELEGRAM_WEBHOOK_SECRET;
    const path = env.TELEGRAM_WEBHOOK_PATH.startsWith("/")
      ? env.TELEGRAM_WEBHOOK_PATH
      : `/${env.TELEGRAM_WEBHOOK_PATH}`;
    const webhookUrl = secret ? `${publicUrl}${path}/${secret}` : `${publicUrl}${path}`;
    try {
      await botSingleton.api.setWebhook(webhookUrl, {
        drop_pending_updates: false,
        allowed_updates: ["message"],
      });
      logger.info("Telegram webhook registered", {
        path: secret ? `${path}/***` : path,
      });
    } catch (err) {
      logger.error("Failed to set Telegram webhook", { message: (err as Error).message });
    }
  } else {
    logger.warn("TELEGRAM_MODE=webhook but API_PUBLIC_URL unset — register webhook manually");
  }

  return { mode: "webhook" };
}

export async function stopTelegramBot(): Promise<void> {
  if (!botSingleton) return;
  try {
    botSingleton.stop();
  } catch {
    // ignore
  }
  botSingleton = null;
}
