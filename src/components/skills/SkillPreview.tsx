"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  skillDetails,
  skillPreviews,
  type SkillId,
} from "@/data/skills";
import { itemTransition } from "@/lib/motion";

interface SkillPreviewProps {
  skill: SkillId;
}

export function SkillPreview({ skill }: SkillPreviewProps) {
  const preview = skillPreviews[skill];
  const detail = skillDetails[skill];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06] lg:min-h-[480px]">
      {/* Browser-style chrome */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#EEE] px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#E8E8E8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#E8E8E8]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#E8E8E8]" />
          </div>
          <span className="truncate rounded-md bg-[#F5F5F5] px-2.5 py-1 font-mono text-[11px] text-[#666]">
            {preview.label}
          </span>
        </div>
        <span className="hidden shrink-0 text-[11px] text-[#AAA] sm:inline">
          {detail.title}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={skill}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={itemTransition}
          className="flex flex-col px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6"
        >
          <p className="mb-3 text-[13px] leading-relaxed text-[#666] sm:mb-4 sm:text-[14px] md:text-[15px]">
            {detail.summary}
          </p>

          <div className="mb-4 sm:mb-5">
            {preview.type === "code" ? (
              <pre className="max-h-[150px] overflow-auto rounded-xl bg-[#1a1a1a] p-3 font-mono text-[10px] leading-relaxed text-[#E8E8E8] sm:max-h-[180px] sm:p-4 sm:text-[11px] md:max-h-[240px] md:p-5 md:text-[12px]">
                <code>{preview.content}</code>
              </pre>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {preview.items.map((item) => (
                  <li
                    key={item.label}
                    className="rounded-xl border border-[#EEE] bg-[#FAFAFA] px-4 py-3"
                  >
                    <span className="block text-[13px] text-[#666]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[14px] font-medium text-[#1a1a1a]">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-5 border-t border-[#EEE] pt-4 sm:gap-6 sm:pt-5 md:grid-cols-2 md:gap-8">
            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-[#999] uppercase">
                Related projects
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.projects.map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-1.5 text-[12px] text-[#555]"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[11px] tracking-[0.18em] text-[#999] uppercase">
                Integrations
              </p>
              <ul className="mt-3 space-y-2">
                {detail.integrations.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[13px] leading-snug text-[#666]"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CCC]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
