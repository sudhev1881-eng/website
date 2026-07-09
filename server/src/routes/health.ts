import { Router } from "express";
import { getPool } from "../db/pool.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let database: "connected" | "disconnected" = "disconnected";

  try {
    await getPool().query("SELECT 1");
    database = "connected";
  } catch {
    database = "disconnected";
  }

  res.json({
    status: database === "connected" ? "ok" : "degraded",
    service: "studentlink-api",
    database,
    timestamp: new Date().toISOString(),
    hint:
      database === "disconnected"
        ? "PostgreSQL is not running. Run: npm run db:up && npm run db:setup"
        : undefined,
  });
});
