"use client";

import { motion } from "framer-motion";
import type { SkillInsight } from "./derive";
import { useSafeMotion } from "@/lib/motion";
import { ConfidenceMeter, SectionHeading } from "./shared";

export function AiSkillInsights({ insights }: { insights: SkillInsight[] }) {
  const motionSafe = useSafeMotion();
  if (insights.length === 0) return null;

  const fromAi = insights.some((i) => i.source === "ai");

  return (
    <motion.section aria-labelledby="skill-insights-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="skill-insights-heading"
        title={fromAi ? "AI Skill Insights" : "Skill Insights"}
        description={
          fromAi
            ? "Model-generated strengths across skill domains."
            : "Derived from skill frequency and proficiency levels."
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <li
            key={`${insight.category}-${insight.strength}`}
            className="rounded-2xl border border-border/70 bg-surface/40 p-4"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {insight.category}
            </p>
            <h3 className="mt-1.5 text-base font-semibold text-foreground">{insight.strength}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{insight.detail}</p>
            <ConfidenceMeter value={insight.confidence} />
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
