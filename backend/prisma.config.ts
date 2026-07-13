// Prisma 7 config — connection URLs come from backend/.env
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Keep applying schema via backend/db/migrate.ts (SQL files).
    // Prisma migrations folder left unused so the two systems don't fight.
    path: "prisma/migrations",
  },
  datasource: {
    // Transaction-mode pooler (IPv4) for app queries
    url: process.env["DATABASE_URL"],
    // Session-mode pooler for introspection / migrate tooling
    ...(process.env["DIRECT_URL"]
      ? { directUrl: process.env["DIRECT_URL"] }
      : {}),
  },
});
