"use client";

import { motion } from "framer-motion";
import type { DerivedHighlight } from "./derive";
import { useSafeMotion } from "@/lib/motion";
import { SectionHeading } from "./shared";
import { cn } from "@/lib/utils";

export function HighlightsRow({ highlights }: { highlights: DerivedHighlight[] }) {
  const motionSafe = useSafeMotion();
  if (highlights.length === 0) return null;

  return (
    <motion.section aria-labelledby="highlights-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="highlights-heading"
        title="Key Highlights"
        description="Signals computed from this profile’s verified and listed experience."
      />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {highlights.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              "group rounded-2xl border border-border/70 bg-surface/50 px-4 py-4 transition-colors duration-300 hover:border-primary/30 hover:bg-surface",
              index === 0 && "sm:col-span-1",
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 font-[family-name:var(--font-profile-display)] text-2xl font-semibold tracking-tight text-foreground">
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 text-xs text-muted-foreground/80">{item.hint}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
