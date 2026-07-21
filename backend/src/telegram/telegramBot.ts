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
    await safeReply(bot, ctx, "⏳ Rate limit exceeded. Please wait a minute and try again.");
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
      await safeReply(bot, ctx, "❌ Unauthorized. This bot is for StudentLink admins only.");
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
      await safeReply(bot, ctx, truncate(reply), { parse_mode: "HTML" });
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
      await safeReply(bot, ctx, formatError(message), { parse_mode: "HTML" });
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
    await safeReply(bot, ctx, helpText(admin), { parse_mode: "HTML" });
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
    await safeReply(bot, ctx, truncate(reply), { parse_mode: "HTML" });
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
    await safeReply(bot, ctx, formatError(message), { parse_mode: "HTML" });
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

async function safeReply(
  bot: Bot,
  ctx: Context,
  text: string,
  extra?: { parse_mode?: "HTML" | "Markdown" | "MarkdownV2" },
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id;
  const trySend = async (payload: { parse_mode?: "HTML" | "Markdown" | "MarkdownV2" } | undefined) => {
    try {
      if (payload?.parse_mode) await ctx.reply(text, payload);
      else await ctx.reply(text);
      return true;
    } catch (err) {
      logger.warn("ctx.reply failed; trying sendMessage", {
        message: err instanceof Error ? err.message : String(err),
        parseMode: payload?.parse_mode ?? "none",
      });
      if (chatId == null) return false;
      try {
        if (payload?.parse_mode) await bot.api.sendMessage(chatId, text, payload);
        else await bot.api.sendMessage(chatId, text);
        return true;
      } catch (err2) {
        logger.warn("sendMessage failed", {
          message: err2 instanceof Error ? err2.message : String(err2),
          parseMode: payload?.parse_mode ?? "none",
        });
        return false;
      }
    }
  };

  if (await trySend(extra)) return;
  // HTML/Markdown entity errors must not swallow the reply entirely.
  if (extra?.parse_mode && (await trySend(undefined))) return;
  throw new Error("Failed to deliver Telegram reply");
}

function createBot(token: string): Bot {
  const bot = new Bot(token);

  bot.catch((err) => {
    logger.error("Telegram bot error", {
      message: err.error instanceof Error ? err.error.message : String(err.error),
    });
  });

  const run = async (ctx: Context) => {
    try {
      await processAuthorizedMessage(bot, ctx, currentRequestIp);
    } catch (err) {
      logger.error("Telegram message handling failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      try {
        await safeReply(bot, ctx, "❌ Something went wrong. Please try again in a moment.");
      } catch {
        // ignore reply failures (e.g. chat not found on synthetic updates)
      }
    }
  };

  // Single message pipeline — do NOT register bot.command("start") separately with an
  // early-return skip on message:/start. Without bot.init(), grammy command filters that
  // touch ctx.me can throw and the skip path then drops /start with zero reply.
  bot.on("message", run);

  return bot;
}

export function getTelegramBot(): Bot | null {
  return botSingleton;
}

export async function processTelegramUpdate(
  update: Update,
  ipAddress?: string | null,
): Promise<void> {
  if (!botSingleton) {
    logger.warn("processTelegramUpdate skipped — bot not started");
    return;
  }
  const previous = currentRequestIp;
  currentRequestIp = ipAddress ?? null;
  const message = "message" in update ? update.message : undefined;
  logger.info("Telegram update received", {
    updateId: update.update_id,
    telegramUserId: message && "from" in message ? message.from?.id : undefined,
    text: message && "text" in message ? message.text?.slice(0, 80) : undefined,
    hasDocument: Boolean(message && "document" in message && message.document),
  });
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

  // Required for webhook mode: command filters and ctx.me need botInfo loaded.
  // bot.start() does this for polling; handleUpdate does not.
  try {
    await botSingleton.init();
    logger.info("Telegram bot initialized", {
      username: botSingleton.botInfo.username,
      id: botSingleton.botInfo.id,
    });
  } catch (err) {
    logger.error("Telegram bot.init() failed", { message: (err as Error).message });
    throw err;
  }

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
        drop_pending_updates: true,
        allowed_updates: ["message"],
        ...(secret ? { secret_token: secret } : {}),
      });
      logger.info("Telegram webhook registered", {
        path: secret ? `${path}/***` : path,
        bot: botSingleton.botInfo.username,
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
