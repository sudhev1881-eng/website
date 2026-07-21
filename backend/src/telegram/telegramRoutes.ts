import { Router, type Request, type Response } from "express";
import type { Update } from "grammy/types";
import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";
import { getTelegramBot, processTelegramUpdate } from "./telegramBot.js";

export const telegramRouter = Router();

function clientIp(req: Request): string | null {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0]?.trim() ?? null;
  return req.socket.remoteAddress ?? null;
}

function assertWebhookSecret(req: Request, res: Response): boolean {
  const env = getEnv();
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;

  const fromPath = req.params.secret;
  const fromHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (fromPath === expected || fromHeader === expected) return true;

  res.status(401).json({ error: "Invalid webhook secret" });
  return false;
}

async function handleWebhook(req: Request, res: Response): Promise<void> {
  if (!assertWebhookSecret(req, res)) return;

  if (!getTelegramBot()) {
    res.status(503).json({ error: "Telegram bot is not running" });
    return;
  }

  const update = req.body as Update;
  if (!update || typeof update !== "object" || !("update_id" in update)) {
    res.status(400).json({ error: "Invalid update payload" });
    return;
  }

  // Process BEFORE acking. Early ack + client disconnect was allowing Telegram to
  // treat delivery as success while our handler never produced a reply (empty
  // telegram_logs despite HTTP 200). Always 200 afterward to avoid retry storms.
  try {
    await processTelegramUpdate(update, clientIp(req));
  } catch (err) {
    logger.error("Telegram webhook handler failed", { message: (err as Error).message });
  }

  if (!res.headersSent) {
    res.json({ ok: true });
  }
}

/** POST /api/telegram/webhook and /api/telegram/webhook/:secret */
telegramRouter.post("/webhook", handleWebhook);
telegramRouter.post("/webhook/:secret", handleWebhook);

telegramRouter.get("/status", (_req, res) => {
  const env = getEnv();
  const mode = env.TELEGRAM_MODE ?? (env.NODE_ENV === "production" ? "webhook" : "polling");
  const path = env.TELEGRAM_WEBHOOK_PATH.startsWith("/")
    ? env.TELEGRAM_WEBHOOK_PATH
    : `/${env.TELEGRAM_WEBHOOK_PATH}`;
  const bot = getTelegramBot();
  res.json({
    enabled: Boolean(env.TELEGRAM_ENABLED && env.TELEGRAM_BOT_TOKEN && bot),
    mode,
    hasToken: Boolean(env.TELEGRAM_BOT_TOKEN),
    hasPublicUrl: Boolean(env.API_PUBLIC_URL),
    hasWebhookSecret: Boolean(env.TELEGRAM_WEBHOOK_SECRET),
    webhookPath: env.TELEGRAM_WEBHOOK_SECRET ? `${path}/:secret` : path,
    botUsername: bot?.botInfo?.username ?? null,
    botInitialized: Boolean(bot?.botInfo?.id),
  });
});
