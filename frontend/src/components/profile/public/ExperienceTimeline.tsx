"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { PublicProfile } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { SectionHeading, KeywordText } from "./shared";
import { cn } from "@/lib/utils";

type ExperienceItem = PublicProfile["experience"][number];

function ExperienceRow({ item }: { item: ExperienceItem }) {
  const [open, setOpen] = React.useState(false);
  const hasBody = Boolean(item.description?.trim());

  return (
    <li className="relative pl-8">
      <span
        className="absolute left-[5px] top-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background"
        aria-hidden="true"
      />
      <div className="rounded-2xl border border-transparent px-1 py-1 transition-colors hover:border-border/60 hover:bg-surface/40">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{item.role}</h3>
            <p className="text-sm text-primary">{item.company}</p>
          </div>
          <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:pt-1">
            {item.period}
          </p>
        </div>
        {hasBody ? (
          <>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Hide details" : "Show details"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  key="body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <KeywordText
                    text={item.description}
                    className="mt-2 pb-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </li>
  );
}

export function ExperienceTimeline({ experience }: { experience: ExperienceItem[] }) {
  const motionSafe = useSafeMotion();
  if (experience.length === 0) return null;

  return (
    <motion.section aria-labelledby="experience-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="experience-heading"
        title="Experience"
        description="Roles and impact in chronological presentation."
      />
      <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-border">
        {experience.map((item) => (
          <ExperienceRow key={item.id} item={item} />
        ))}
      </ol>
    </motion.section>
  );
}
