"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import { experienceItems, experienceSection } from "@/data/experience";
import { useSectionPairSnap } from "@/hooks/useSectionPairSnap";
import { cn } from "@/lib/utils";
import { sectionTransition, smoothSpring } from "@/lib/motion";

export function ExperienceSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeIndex, setActiveIndex] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useSectionPairSnap({ upperId: "experience", lowerId: "contact" });

  return (
    <section
      id="experience"
      className="relative bg-[#F7F7F5] px-4 py-20 text-[#1a1a1a] sm:px-6 sm:py-24 lg:snap-start lg:snap-always lg:py-32"
    >
      <div ref={ref} className="mx-auto max-w-[1120px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={sectionTransition}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-mono text-[11px] tracking-[0.22em] text-[#8A8A8A] uppercase">
            {experienceSection.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-normal tracking-[-0.02em] text-[#1a1a1a] md:text-4xl lg:text-[2.5rem]">
            {experienceSection.title}
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#666]">
            {experienceSection.subtitle}
          </p>
        </motion.div>

        <div className="relative mt-14 hidden lg:block">
          <div className="absolute top-1/2 right-[8%] left-[8%] h-px -translate-y-1/2 bg-[#E0E0E0]" />
          <motion.div
            className="absolute top-1/2 left-[8%] h-px -translate-y-1/2 bg-[#1a1a1a]"
            initial={{ width: "0%" }}
            animate={
              isInView
                ? {
                    width: `${(activeIndex / (experienceItems.length - 1)) * 84}%`,
                  }
                : { width: "0%" }
            }
            transition={{ ...sectionTransition, duration: 0.7 }}
          />
          <div className="relative grid grid-cols-3">
            {experienceItems.map((item, index) => (
              <button
                key={`${item.role}-dot`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="flex justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#CCC]"
                aria-label={`View ${item.role} at ${item.organization}`}
              >
                <motion.span
                  animate={{
                    scale: activeIndex === index ? 1.25 : 1,
                    backgroundColor:
                      activeIndex === index ? "#1a1a1a" : "#FFFFFF",
                    borderColor: activeIndex === index ? "#1a1a1a" : "#CCCCCC",
                  }}
                  transition={smoothSpring}
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border-2",
                    activeIndex >= index ? "shadow-sm" : ""
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:mt-10 lg:grid-cols-3">
          {experienceItems.map((item, index) => (
            <ExperienceCard
              key={`${item.role}-${item.organization}`}
              item={item}
              index={index}
              isActive={activeIndex === index}
              isDimmed={isDesktop && activeIndex !== index}
              isInView={isInView}
              onSelect={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
