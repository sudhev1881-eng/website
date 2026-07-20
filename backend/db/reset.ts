import "dotenv/config";
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDbUrl(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Set DIRECT_URL or DATABASE_URL in backend/.env");
  }
  return url;
}

async function cleanDatabase(pool: pg.Pool): Promise<void> {
  console.log("Dropping application tables and types...");

  await pool.query(`
    DROP TABLE IF EXISTS
      public.profile_events,
      public.webauthn_challenges,
      public.webauthn_credentials,
      public.projects,
      public.skills,
      public.certificates,
      public.experience,
      public.resumes,
      public.nfc_cards,
      public.students,
      public.universities,
      public.users
    CASCADE;

    DROP TYPE IF EXISTS public.user_role CASCADE;
    DROP TYPE IF EXISTS public.student_status CASCADE;
    DROP TYPE IF EXISTS public.nfc_card_status CASCADE;
  `);

  console.log("Database cleaned.");
}

function runScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", join(__dirname, script)], {
      stdio: "inherit",
      env: process.env,
      cwd: join(__dirname, ".."),
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function reset() {
  const pool = new pg.Pool({ connectionString: getDbUrl() });

  try {
    await cleanDatabase(pool);
    await pool.end();

    console.log("Re-applying migrations...");
    await runScript("migrate.ts");

    console.log("Seeding fresh demo data...");
    await runScript("seed.ts");

    console.log("Database reset complete.");
  } catch (err) {
    await pool.end().catch(() => undefined);
    throw err;
  }
}

reset().catch((err) => {
  console.error("Database reset failed:", err);
  process.exit(1);
});
