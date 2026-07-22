"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SetupErrorProps {
  title: string;
  steps: string[];
  description?: string;
  healthUrl?: string;
}

function isLocalDevApi(): boolean {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  return /localhost|127\.0\.0\.1/.test(base);
}

export function apiHealthUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
  return base.endsWith("/api") ? `${base}/health` : `${base}/api/health`;
}

/** True when Docker/local Postgres setup instructions are appropriate. */
export function shouldShowLocalDbSetup(status: number | null): boolean {
  if (!isLocalDevApi()) return false;
  // Network failure (null) or server/DB errors during local development
  return status === null || status === 500 || status === 503;
}

export function SetupError({
  title,
  steps,
  description = "The API is running but the database is not set up. Admin and public profiles need PostgreSQL.",
  healthUrl = "http://localhost:4000/api/health",
}: SetupErrorProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-warning/40 bg-warning/5 p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-warning" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <ol className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <li key={step}>
            <span className="font-medium text-foreground">{i + 1}.</span> {step}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Check API health:{" "}
        <a href={healthUrl} target="_blank" rel="noreferrer" className="text-primary underline">
          {healthUrl.replace(/^https?:\/\//, "")}
        </a>{" "}
        (should show <code>database: connected</code>)
      </p>
      <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

/** Production / non-local load failure — no Docker localhost instructions. */
export function LoadError({
  title,
  message,
  detail,
}: {
  title: string;
  message: string;
  detail?: string | null;
}) {
  const health = apiHealthUrl();
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-muted/30 p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {detail ? <p className="mt-2 text-xs text-error">{detail}</p> : null}
      <p className="mt-4 text-xs text-muted-foreground">
        API status:{" "}
        <a href={health} target="_blank" rel="noreferrer" className="text-primary underline">
          {health.replace(/^https?:\/\//, "")}
        </a>
      </p>
      <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

export const DB_SETUP_STEPS = [
  "npm run db:up          (starts PostgreSQL — needs Docker)",
  "npm run db:setup       (migrations + demo data)",
  "cd backend && npm run dev   (restart API)",
];
