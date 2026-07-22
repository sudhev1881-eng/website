import "dotenv/config";
import express from "express";
import { getEnv } from "./config/env.js";
import type { Env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { applySecurityMiddleware } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { studentsRouter } from "./routes/students.js";
import { profilesRouter } from "./routes/profiles.js";
import { adminRouter } from "./routes/admin.js";
import { nfcRouter } from "./routes/nfc.js";
import { uploadsRouter } from "./routes/uploads.js";
import { universitiesRouter } from "./routes/universities.js";
import { ensureStorageReady } from "./services/storage.js";
import { getPool } from "./db/pool.js";
import { startTelegramBot, telegramRouter } from "./telegram/index.js";
import { registerBotCommands } from "./telegram/telegramCommands.js";
import { getTelegramBot } from "./telegram/telegramBot.js";
import {
  startResumeProcessingWorker,
  stopResumeProcessingWorker,
} from "./queues/resume-processing.queue.js";

const app = express();

let env: Env;
try {
  env = getEnv();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

applySecurityMiddleware(app);
app.use(express.json({ limit: "256kb" }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/students", uploadsRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/universities", universitiesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/nfc", nfcRouter);
app.use("/api/telegram", telegramRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await getPool().query("SELECT 1");
    logger.info("PostgreSQL connected");
  } catch (err) {
    logger.error("PostgreSQL connection failed", { message: (err as Error).message });
    process.exit(1);
  }

  try {
    await ensureStorageReady();
    logger.info("Supabase Storage ready");
  } catch (err) {
    logger.error("Supabase Storage init failed", { message: (err as Error).message });
    if (env.NODE_ENV === "production") {
      process.exit(1);
    }
    logger.warn("Continuing without storage — check SUPABASE_SERVICE_ROLE_KEY and create the studentlink bucket");
  }

  if (env.NFC_CLOUD_MODE) {
    logger.info("NFC cloud mode — physical reader disabled; cards managed as profile URLs in database");
  }

  try {
    await startResumeProcessingWorker();
  } catch (err) {
    logger.warn("Resume processing worker failed to start — uploads still work", {
      message: (err as Error).message,
    });
  }

  // Listen BEFORE registering the Telegram webhook. setWebhook causes Telegram to
  // POST immediately; if the port is not open yet, Render returns 404 and the bot
  // appears dead until the next successful delivery.
  const host = "0.0.0.0";
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(env.PORT, host, () => {
      logger.info("StudentLink API started", {
        port: env.PORT,
        host,
        cors: env.CORS_ORIGIN,
        siteUrl: env.SITE_URL,
        nodeEnv: env.NODE_ENV,
      });
      resolve();
    });
    server.on("error", reject);
  });

  try {
    const telegram = await startTelegramBot();
    if (telegram.mode !== "disabled") {
      const bot = getTelegramBot();
      if (bot) {
        try {
          await registerBotCommands(bot);
        } catch (err) {
          logger.warn("Failed to register Telegram command menu", {
            message: (err as Error).message,
          });
        }
      }
      logger.info("Telegram Admin Assistant ready", { mode: telegram.mode });
    }
  } catch (err) {
    logger.error("Telegram bot failed to start — API continues without bot", {
      message: (err as Error).message,
    });
  }

  const shutdown = async (signal: string) => {
    logger.info("Shutting down", { signal });
    try {
      await stopResumeProcessingWorker();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

start();
