"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { CrosswordPuzzle } from "@/components/wordsearch/CrosswordPuzzle";
import { KnowledgeGraphBackground } from "@/components/wordsearch/KnowledgeGraphBackground";
import { crosswordSection } from "@/data/crossword";
import { sectionTransition } from "@/lib/motion";

export function WordSearchSection() {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    const handleMove = (event: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      section.style.setProperty("--mouse-x", `${x}%`);
      section.style.setProperty("--mouse-y", `${y}%`);
    };

    section.addEventListener("mousemove", handleMove);
    return () => section.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-4 py-20 text-[#1a1a1a] sm:px-6 sm:py-24 lg:py-32"
    >
      <KnowledgeGraphBackground />

      <div className="relative z-10 mx-auto max-w-[1120px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={sectionTransition}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-mono text-[11px] tracking-[0.22em] text-white/85 uppercase">
            {crosswordSection.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.02em] text-white drop-shadow-[0_2px_14px_rgba(15,23,42,0.45)] md:text-4xl lg:text-[2.5rem]">
            {crosswordSection.title}
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/90 drop-shadow-[0_1px_8px_rgba(15,23,42,0.3)]">
            {crosswordSection.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            ...sectionTransition,
            delay: 0.12,
          }}
          className="mt-8 overflow-hidden rounded-2xl bg-white/92 p-3 shadow-md ring-1 ring-white/60 backdrop-blur-[2px] md:p-4"
        >
          <CrosswordPuzzle />
        </motion.div>
      </div>
    </section>
  );
}
