"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { skillsSection, skillFeatureColumns, type SkillId } from "@/data/skills";
import { SkillSelector } from "@/components/skills/SkillSelector";
import { SkillPreview } from "@/components/skills/SkillPreview";
import { SkillsChat } from "@/components/skills/SkillsChat";
import { cn } from "@/lib/utils";
import { sectionTransition } from "@/lib/motion";

type MobilePanel = "preview" | "chat";

export function SkillsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeSkill, setActiveSkill] = useState<SkillId>("javascript");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("preview");

  return (
    <section
      id="skills"
      className="relative bg-[#F7F7F5] px-5 py-16 text-[#1a1a1a] sm:px-6 sm:py-20 lg:snap-start lg:snap-always lg:py-28"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-28 md:block lg:w-48"
        aria-hidden
      >
        <div className="absolute inset-y-0 left-0 w-16 overflow-hidden lg:w-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#4DB8FF] via-[#52b8f5] to-[#48c95a]" />
          <img
            src="/images/about-pixel-bg.png"
            alt=""
            className="absolute inset-y-0 left-0 h-full w-[280%] max-w-none object-cover object-left brightness-[1.2] saturate-[1.6] contrast-[1.08] [image-rendering:pixelated]"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, rgba(247,247,245,0.08) 28%, rgba(247,247,245,0.35) 48%, rgba(247,247,245,0.68) 68%, rgba(247,247,245,0.9) 84%, #F7F7F5 100%)",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-28 md:block lg:w-48"
        aria-hidden
      >
        <div className="absolute inset-y-0 right-0 w-16 overflow-hidden lg:w-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[#4DB8FF] via-[#52b8f5] to-[#48c95a]" />
          <img
            src="/images/about-pixel-bg.png"
            alt=""
            className="absolute inset-y-0 right-0 h-full w-[280%] max-w-none object-cover object-right brightness-[1.2] saturate-[1.6] contrast-[1.08] [image-rendering:pixelated]"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to left, transparent 0%, rgba(247,247,245,0.08) 28%, rgba(247,247,245,0.35) 48%, rgba(247,247,245,0.68) 68%, rgba(247,247,245,0.9) 84%, #F7F7F5 100%)",
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-36"
        style={{
          background:
            "linear-gradient(to bottom, #F7F7F5 0%, rgba(247,247,245,0.92) 35%, rgba(247,247,245,0.55) 60%, transparent 100%)",
        }}
        aria-hidden
      />
      <div ref={ref} className="relative z-10 mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={sectionTransition}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-mono text-[11px] tracking-[0.22em] text-[#8A8A8A] uppercase">
            {skillsSection.eyebrow}
          </p>
          <h2 className="mt-3 text-[1.625rem] leading-snug font-normal tracking-[-0.02em] text-[#1a1a1a] sm:mt-4 sm:text-3xl sm:leading-tight md:text-4xl lg:text-[2.75rem]">
            {skillsSection.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#666] sm:mt-6 sm:text-[16px] md:text-[17px]">
            {skillsSection.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...sectionTransition, delay: 0.15 }}
          className="mt-8 sm:mt-10"
        >
          <SkillSelector active={activeSkill} onSelect={setActiveSkill} />

          {/* Mobile: one panel at a time so cards aren't stacked and cramped */}
          <div className="mt-5 lg:hidden">
            <div
              className="flex rounded-full border border-[#E0E0E0] bg-white p-1"
              role="tablist"
              aria-label="Skills view"
            >
              {(
                [
                  ["preview", "Preview"],
                  ["chat", "Ask"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mobilePanel === id}
                  onClick={() => setMobilePanel(id)}
                  className={cn(
                    "flex-1 rounded-full py-2 text-[13px] transition-colors",
                    mobilePanel === id
                      ? "bg-[#1a1a1a] font-medium text-white"
                      : "text-[#666]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className={mobilePanel === "preview" ? "block" : "hidden"}>
                <SkillPreview skill={activeSkill} />
              </div>
              <div className={mobilePanel === "chat" ? "block" : "hidden"}>
                <SkillsChat
                  activeSkill={activeSkill}
                  onSkillChange={setActiveSkill}
                  variant="mobile"
                />
              </div>
            </div>
          </div>

          {/* Desktop: side-by-side layout unchanged */}
          <div className="mt-8 hidden items-start gap-8 lg:grid lg:grid-cols-[1.15fr_0.85fr]">
            <SkillPreview skill={activeSkill} />
            <SkillsChat
              activeSkill={activeSkill}
              onSkillChange={setActiveSkill}
            />
          </div>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:gap-8 md:grid-cols-3">
          {skillFeatureColumns.map((col) => (
            <div key={col.title}>
              <h3 className="text-[16px] font-medium text-[#1a1a1a]">
                {col.title}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[#666]">
                {col.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
