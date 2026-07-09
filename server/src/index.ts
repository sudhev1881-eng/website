import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { studentsRouter } from "./routes/students.js";
import { profilesRouter } from "./routes/profiles.js";
import { adminRouter } from "./routes/admin.js";
import { nfcRouter } from "./routes/nfc.js";
import { getPool } from "./db/pool.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/admin", adminRouter);
app.use("/api/nfc", nfcRouter);

async function start() {
  try {
    await getPool().query("SELECT 1");
    console.log("PostgreSQL connected");
  } catch (err) {
    console.warn("PostgreSQL not available:", (err as Error).message);
    console.warn("Run: docker compose up -d postgres && npm run db:migrate && npm run db:seed");
  }

  app.listen(port, () => {
    console.log(`StudentLink API running on http://localhost:${port}`);
    console.log(`  Health:   http://localhost:${port}/api/health`);
    console.log(`  Auth:     http://localhost:${port}/api/auth/login`);
    console.log(`  Profiles: http://localhost:${port}/api/profiles/:slug`);
    console.log(`  CORS:     ${corsOrigin}`);
  });
}

start();
