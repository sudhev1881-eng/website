"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ExperienceItem } from "@/data/experience";
import { cn } from "@/lib/utils";
import { itemTransition, layoutSpring, smoothSpring } from "@/lib/motion";

interface ExperienceCardProps {
  item: ExperienceItem;
  index: number;
  isActive: boolean;
  isDimmed: boolean;
  isInView: boolean;
  onSelect: () => void;
}

export function ExperienceCard({
  item,
  index,
  isActive,
  isDimmed,
  isInView,
  onSelect,
}: ExperienceCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.article
      layout
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onMouseEnter={onSelect}
      initial={{ opacity: 0, y: 28 }}
      animate={
        isInView
          ? {
              opacity: isDimmed ? 0.5 : 1,
              y: 0,
              scale: isActive ? 1.02 : 1,
            }
          : { opacity: 0, y: 28 }
      }
      whileHover={reduced ? undefined : { y: isActive ? -2 : -6 }}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{
        ...itemTransition,
        delay: 0.08 * index,
        layout: layoutSpring,
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm outline-none transition-shadow duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-[#CCC] sm:p-6",
        isActive
          ? "border-[#1a1a1a] shadow-md"
          : "border-[#E8E8E8] hover:border-[#CCC] hover:shadow-md"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="experience-accent"
          className="absolute top-5 bottom-5 left-0 w-1 rounded-full bg-[#1a1a1a]"
          transition={smoothSpring}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-wide text-[#999] uppercase">
            {item.period}
          </p>
          <h3 className="mt-2 text-xl font-normal tracking-[-0.01em] text-[#1a1a1a]">
            {item.role}
          </h3>
          <p className="mt-1 text-[14px] text-[#7A7A7A]">{item.organization}</p>
        </div>
        <motion.span
          animate={{
            scale: isActive ? 1.08 : 1,
            backgroundColor: isActive ? "#1a1a1a" : "#FAFAFA",
            color: isActive ? "#FFFFFF" : "#8A8A8A",
            borderColor: isActive ? "#1a1a1a" : "#E5E5E5",
          }}
          transition={itemTransition}
          className="rounded-full border px-3 py-1 font-mono text-[10px] tracking-wide uppercase"
        >
          {index + 1}
        </motion.span>
      </div>

      <p className="mt-5 text-[15px] leading-relaxed text-[#555]">
        {item.description}
      </p>

      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            key="highlights"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ ...itemTransition, delay: 0.04 }}
            className="overflow-hidden"
          >
            <ul className="mt-5 space-y-2 border-t border-[#EEE] pt-5">
              {item.highlights.map((highlight, highlightIndex) => (
                <motion.li
                  key={highlight}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    ...itemTransition,
                    delay: 0.05 * highlightIndex,
                  }}
                  className="flex items-start gap-2.5 text-[14px] text-[#444]"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1a1a1a]"
                    aria-hidden
                  />
                  {highlight}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 font-mono text-[10px] tracking-wide text-[#AAA] uppercase">
        {isActive ? "Selected" : "Hover or tap to explore"}
      </p>
    </motion.article>
  );
}
