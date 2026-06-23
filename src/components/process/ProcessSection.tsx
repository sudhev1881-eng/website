"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { processHeadline, processSubheadline } from "@/data/process";
import { WorkflowDiagram } from "@/components/process/WorkflowDiagram";
import { ProcessChat } from "@/components/process/ProcessChat";
import { useSectionPairSnap } from "@/hooks/useSectionPairSnap";
import { sectionTransition } from "@/lib/motion";

export function ProcessSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useSectionPairSnap({ upperId: "about", lowerId: "skills" });

  return (
    <section
      id="about"
      className="relative overflow-hidden px-4 pt-20 pb-14 text-[#1a1a1a] sm:px-6 sm:pt-24 sm:pb-16 lg:snap-start lg:snap-always lg:pt-32 lg:pb-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[#52b8f5]" aria-hidden>
        <img
          src="/images/about-pixel-bg.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center brightness-[1.28] saturate-[1.75] contrast-[1.1] [image-rendering:pixelated]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, #4DB8FF 0%, #52b8f5 14%, rgba(82, 184, 245, 0.82) 24%, rgba(94, 196, 255, 0.45) 34%, transparent 46%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.28),transparent_48%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-sky-300/8 to-transparent" />
        <div
          className="absolute inset-x-0 bottom-0 h-[38%]"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(82, 184, 245, 0.12) 22%, rgba(210, 234, 248, 0.5) 48%, rgba(241, 246, 244, 0.9) 72%, #F7F7F5 100%)",
          }}
        />
      </div>

      <div ref={ref} className="relative z-10 mx-auto max-w-[1120px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={sectionTransition}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="text-3xl leading-tight font-normal tracking-[-0.02em] text-white drop-shadow-[0_2px_12px_rgba(15,23,42,0.35)] sm:text-4xl md:text-5xl lg:text-[3rem]">
            {processHeadline}
          </h2>
          <p className="mt-4 -translate-y-[0.21cm] text-[16px] leading-relaxed text-white drop-shadow-[0_1px_8px_rgba(15,23,42,0.3)]">
            {processSubheadline}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...sectionTransition, delay: 0.15 }}
          className="mt-14 overflow-hidden rounded-2xl bg-white/92 p-3 shadow-md ring-1 ring-white/60 backdrop-blur-[2px] md:p-4"
        >
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <WorkflowDiagram />
            <ProcessChat />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
