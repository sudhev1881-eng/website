import "dotenv/config";
import { readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getMigrationUrl(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DIRECT_URL or DATABASE_URL in backend/.env");
  }
  return url;
}

async function migrate() {
  const pool = new pg.Pool({ connectionString: getMigrationUrl() });
  const files = readdirSync(join(__dirname, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(__dirname, "migrations", file), "utf-8");
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }

  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
