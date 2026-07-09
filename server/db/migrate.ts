import { readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getPool, closePool } from "../src/db/pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const pool = getPool();
  const files = readdirSync(join(__dirname, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(__dirname, "migrations", file), "utf-8");
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }

  await closePool();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
