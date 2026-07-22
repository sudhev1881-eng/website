"use client";

import { motion } from "framer-motion";
import type { RecruiterInsight } from "./derive";
import { useSafeMotion } from "@/lib/motion";
import { ConfidenceMeter, SectionHeading } from "./shared";

export function InsightCards({ insights }: { insights: RecruiterInsight[] }) {
  const motionSafe = useSafeMotion();
  if (insights.length === 0) return null;

  const fromAi = insights.some((i) => i.source === "ai");

  return (
    <motion.section aria-labelledby="recruiter-insights-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="recruiter-insights-heading"
        title={fromAi ? "Recruiter Insights" : "Hiring Signals"}
        description={
          fromAi
            ? "AI-assisted notes with confidence scores."
            : "Heuristic notes based on profile density and signals."
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="rounded-2xl border border-border/70 bg-background p-4 sm:p-5"
          >
            <h3 className="text-base font-semibold text-foreground">{insight.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{insight.detail}</p>
            <ConfidenceMeter value={insight.confidence} />
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
