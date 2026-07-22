"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { SkillCategoryGroup } from "./derive";
import { useSafeMotion } from "@/lib/motion";
import { SectionHeading } from "./shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const INITIAL_CATEGORIES = 3;

export function SkillsMatrix({ groups }: { groups: SkillCategoryGroup[] }) {
  const motionSafe = useSafeMotion();
  const [expanded, setExpanded] = React.useState(false);
  if (groups.length === 0) return null;

  const visible = expanded ? groups : groups.slice(0, INITIAL_CATEGORIES);
  const hasMore = groups.length > INITIAL_CATEGORIES;

  return (
    <motion.section aria-labelledby="skills-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="skills-heading"
        title="Skills"
        description="Grouped by domain, strongest categories first."
      />
      <div className="space-y-5">
        {visible.map((group) => (
          <div key={group.category}>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{group.category}</h3>
              <span className="text-xs text-muted-foreground">
                {group.skills.length} skill{group.skills.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <li key={`${group.category}-${skill.name}`}>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-md border-border/80 bg-background px-2.5 py-1 font-medium",
                      skill.level >= 80 && "border-primary/30 bg-primary/5 text-foreground",
                    )}
                    title={`Proficiency ${skill.level}%`}
                  >
                    {skill.name}
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                      {skill.level}
                    </span>
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show fewer categories" : `Show all ${groups.length} categories`}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </motion.section>
  );
}
