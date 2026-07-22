"use client";

import { motion } from "framer-motion";
import type { PublicProfileEducation } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { SectionHeading } from "./shared";

export function EducationTimeline({
  education,
  graduationYear,
}: {
  education: PublicProfileEducation[];
  graduationYear?: number | null;
}) {
  const motionSafe = useSafeMotion();
  if (education.length === 0) return null;

  return (
    <motion.section aria-labelledby="education-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="education-heading"
        title="Education"
        description="Academic background and focus."
      />
      <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-border">
        {education.map((item) => {
          const degreeLine = [item.degree, item.field].filter(Boolean).join(" in ");
          const period =
            [item.startDate, item.endDate || (graduationYear ? String(graduationYear) : null)]
              .filter(Boolean)
              .join(" – ") || null;

          return (
            <li key={item.id} className="relative pl-8">
              <span
                className="absolute left-[5px] top-2 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background"
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold text-foreground">{item.school}</h3>
              {degreeLine ? <p className="mt-0.5 text-sm text-primary">{degreeLine}</p> : null}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {period ? <span>{period}</span> : null}
                {item.gpa ? <span>GPA {item.gpa}</span> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}
