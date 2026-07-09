import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health.js";
import { nfcRouter } from "./routes/nfc.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/nfc", nfcRouter);

app.listen(port, () => {
  console.log(`StudentLink API running on http://localhost:${port}`);
  console.log(`  Health:  http://localhost:${port}/api/health`);
  console.log(`  NFC:     http://localhost:${port}/api/nfc/status`);
  console.log(`  CORS:    ${corsOrigin}`);
  console.log(`  NFC hardware: ${process.env.NFC_READER_ENABLED === "true" ? "enabled" : "stub mode"}`);
});
