import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getPool, closePool } from "../src/db/pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(
    join(__dirname, "migrations", "001_initial.sql"),
    "utf-8",
  );
  const pool = getPool();
  await pool.query(sql);
  console.log("Migration 001_initial.sql applied successfully.");
  await closePool();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
