"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { site } from "@/data/site";
import { Button } from "@/components/ui/Button";
import { HeroVideo } from "@/components/hero/HeroVideo";
import { useHeroSectionSnap } from "@/hooks/useHeroSectionSnap";
import {
  heroContainerVariants,
  scrollSpring,
  useSafeMotion,
} from "@/lib/motion";

export function Hero() {
  const { heroItem } = useSafeMotion();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  useHeroSectionSnap();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, scrollSpring);

  const contentY = useTransform(smoothProgress, [0, 1], [0, reduced ? 0 : -36]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.72], [1, reduced ? 1 : 0]);
  const sceneScale = useTransform(smoothProgress, [0, 1], [1, reduced ? 1 : 1.035]);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative h-[100dvh] overflow-hidden bg-[#e8f4fc] lg:snap-start lg:snap-always"
    >
      {/* Full-bleed video background */}
      <motion.div className="absolute inset-0" style={{ scale: sceneScale }}>
        <HeroVideo />

        {/* Soft blend below the solid white nav bar */}
        <div className="absolute inset-x-0 top-16 h-[16%] bg-gradient-to-b from-white via-white/40 to-transparent" />

        {/* Mobile: soft fade behind copy */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[50%] bg-gradient-to-t from-white/95 via-white/55 to-transparent sm:hidden" />

        {/* Desktop: left fade */}
        <div className="pointer-events-none absolute inset-0 hidden max-w-[55%] bg-gradient-to-r from-white/55 via-white/20 to-transparent md:block lg:max-w-[48%]" />

        {/* Subtle sky warmth over the scene */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(135,206,250,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(74,222,128,0.12),transparent_50%)]" />
      </motion.div>

      {/* Blend hero into the About section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-28 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/85 to-transparent" />

      {/* Foreground content */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-5 pt-24 pb-10 sm:justify-center sm:px-6 sm:pt-28 sm:pb-16 lg:pt-24">
        <motion.div
          className="max-w-xl sm:max-w-xl lg:max-w-[560px]"
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          style={{ y: contentY, opacity: contentOpacity }}
        >
          <motion.div
            variants={heroItem}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/35 px-3 py-1.5 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
            </span>
            <span className="text-[11px] font-medium tracking-wide text-[#475569]">
              Open to opportunities
            </span>
          </motion.div>

          <motion.h1
            variants={heroItem}
            className="font-serif text-[1.65rem] leading-[1.1] font-normal tracking-[-0.03em] text-white drop-shadow-[0_2px_14px_rgba(15,23,42,0.45)] min-[400px]:text-[1.85rem] sm:text-4xl sm:leading-[1.06] md:text-5xl lg:text-[3.5rem]"
          >
            {site.tagline}
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#334155] sm:mt-5 sm:text-lg md:text-xl"
          >
            {site.subheadline}
          </motion.p>

          <motion.div
            variants={heroItem}
            className="mt-7 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
          >
            <Button
              href={site.ctas.primary.href}
              variant="primary"
              className="border border-white/55 bg-transparent text-white backdrop-blur-sm hover:border-white/80 hover:bg-white/15 hover:text-white"
            >
              {site.ctas.primary.label}
            </Button>
            <Button href={site.ctas.secondary.href} variant="outline">
              {site.ctas.secondary.label}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
