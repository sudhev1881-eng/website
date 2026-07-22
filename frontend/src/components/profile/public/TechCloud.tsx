"use client";

import { motion } from "framer-motion";
import type { TechCloudItem } from "./derive";
import { useSafeMotion } from "@/lib/motion";
import { SectionHeading } from "./shared";
import { cn } from "@/lib/utils";

export function TechCloud({ items }: { items: TechCloudItem[] }) {
  const motionSafe = useSafeMotion();
  if (items.length === 0) return null;

  return (
    <motion.section aria-labelledby="tech-cloud-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="tech-cloud-heading"
        title="Tech Stack"
        description="Sized by frequency across skills and projects."
      />
      <ul className="flex flex-wrap items-end gap-x-3 gap-y-3" aria-label="Technology frequency">
        {items.map((item) => {
          const size =
            item.weight > 0.75
              ? "text-xl sm:text-2xl font-semibold"
              : item.weight > 0.45
                ? "text-base sm:text-lg font-medium"
                : "text-sm font-normal text-muted-foreground";
          return (
            <li key={item.name}>
              <span
                className={cn(
                  "inline-block rounded-md px-1.5 py-0.5 text-foreground transition-colors hover:text-primary",
                  size,
                )}
                title={`Mentioned ${item.count}×`}
              >
                {item.name}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
