import { Router } from "express";
import { getPool } from "../db/pool.js";
import { ensureStorageReady } from "../services/storage.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let database: "connected" | "disconnected" = "disconnected";
  let storage: "connected" | "disconnected" = "disconnected";

  try {
    await getPool().query("SELECT 1");
    database = "connected";
  } catch {
    database = "disconnected";
  }

  try {
    await ensureStorageReady();
    storage = "connected";
  } catch {
    storage = "disconnected";
  }

  const ok = database === "connected" && storage === "connected";

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    service: "studentlink-api",
    database,
    storage,
    timestamp: new Date().toISOString(),
  });
});
