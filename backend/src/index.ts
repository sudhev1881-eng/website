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

  const host = "0.0.0.0";
  app.listen(env.PORT, host, () => {
    logger.info("StudentLink API started", {
      port: env.PORT,
      host,
      cors: env.CORS_ORIGIN,
      siteUrl: env.SITE_URL,
      nodeEnv: env.NODE_ENV,
    });
  });
}

start();
