"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { PublicProfile } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { isAiGenerated, resolveSummary } from "./derive";
import { KeywordText, SectionHeading } from "./shared";

export function AiSummaryCard({ profile }: { profile: PublicProfile }) {
  const summary = resolveSummary(profile);
  const motionSafe = useSafeMotion();
  if (!summary) return null;

  const ai = isAiGenerated(profile);
  const title = ai ? "AI Summary" : "Professional Summary";

  return (
    <motion.section
      aria-labelledby="summary-heading"
      className="rounded-2xl border border-border/70 bg-background p-6 sm:p-7"
      variants={motionSafe.fadeIn}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <SectionHeading
          id="summary-heading"
          title={title}
          description={
            ai
              ? "Generated overview for recruiters — verify against projects and experience."
              : "A concise narrative of strengths and focus areas."
          }
          className="mb-0"
        />
        {ai ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            AI
          </span>
        ) : null}
      </div>
      <KeywordText
        text={summary}
        className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line"
      />
    </motion.section>
  );
}
