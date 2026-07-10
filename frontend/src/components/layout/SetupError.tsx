"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SetupErrorProps {
  title: string;
  steps: string[];
}

export function SetupError({ title, steps }: SetupErrorProps) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-warning/40 bg-warning/5 p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-warning" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The API is running but the database is not set up. Admin and public profiles need PostgreSQL.
      </p>
      <ol className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <li key={step}>
            <span className="font-medium text-foreground">{i + 1}.</span> {step}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Check API health:{" "}
        <a
          href="http://localhost:4000/api/health"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          localhost:4000/api/health
        </a>
        {" "}(should show <code>database: connected</code>)
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
  "cd server && npm run dev   (restart API)",
];
