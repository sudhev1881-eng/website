"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Globe } from "lucide-react";
import { site } from "@/data/site";

function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 1.5 13.8 9.2 21.5 11 13.8 12.8 12 20.5 10.2 12.8 2.5 11l7.7-1.8L12 1.5Z" />
    </svg>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const watermarkY = useTransform(scrollY, [0, 600], [0, -70]);
  const portraitY = useTransform(scrollY, [0, 600], [0, 90]);
  const portraitScale = useTransform(scrollY, [0, 600], [1, 1.06]);

  return (
    <section className="hero-stage relative min-h-[100svh] overflow-hidden px-5 pb-12 pt-6 md:px-10 lg:px-14">
      {/* Layer 1 — full-width PORTFOLIO behind the subject */}
      <motion.div
        className="pointer-events-none absolute inset-x-[-2vw] top-[2%] z-[1] flex select-none justify-center md:top-[0%]"
        style={reduce ? undefined : { y: watermarkY }}
        aria-hidden
      >
        <p className="portfolio-watermark">PORTFOLIO</p>
      </motion.div>

      {/* Layer 2 — masked subject so letters stay visible around him */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[18%] z-[4] w-[min(78vw,420px)] -translate-x-1/2 md:top-[14%] md:w-[min(34vw,400px)] lg:top-[12%]"
        style={reduce ? undefined : { y: portraitY, scale: portraitScale }}
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      >
        <div className="hero-portrait-mask relative mx-auto aspect-[3/4] w-full">
          <div className="hero-portrait-glow absolute inset-0" />
          <Image
            src="/images/portrait.png"
            alt={`${site.name} portrait`}
            fill
            priority
            sizes="(max-width: 768px) 78vw, 400px"
            className="object-cover object-[center_12%]"
          />
        </div>
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-32 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/80 to-transparent" />

      {/* Top meta row */}
      <div className="relative z-20 mx-auto flex max-w-7xl items-start justify-between gap-4 text-[0.68rem] font-medium uppercase tracking-[0.18em] md:text-xs">
        <motion.p
          className="flex flex-wrap gap-x-2"
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
        >
          <span className="text-[var(--red)]">Computer Engineering</span>
          <span className="text-white/75">/ Developer</span>
        </motion.p>
        <motion.p
          className="flex items-center gap-2 text-right text-white/85"
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
        >
          {site.available}
          <Sparkle className="h-3.5 w-3.5 text-[var(--red)]" />
        </motion.p>
      </div>

      {/* Foreground content flanking the portrait */}
      <div className="relative z-20 mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl grid-cols-1 content-end gap-10 pt-[48%] sm:pt-[42%] lg:grid-cols-[1fr_minmax(280px,34vw)_1fr] lg:content-center lg:items-end lg:gap-4 lg:pt-0 lg:pb-16">
        {/* Left copy */}
        <div className="max-w-md lg:max-w-sm xl:max-w-md">
          <motion.p
            className="font-[family-name:var(--font-script)] text-3xl text-white md:text-[2.35rem]"
            initial={reduce ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            Hello, I&apos;m
          </motion.p>

          <motion.h1
            className="mt-1 font-[family-name:var(--font-display)] text-[3.1rem] font-extrabold uppercase leading-[0.9] tracking-[-0.03em] text-white sm:text-6xl md:text-7xl"
            initial={reduce ? false : { opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.32 }}
          >
            {site.name.split(" ").map((part) => (
              <span key={part} className="block">
                {part}
              </span>
            ))}
          </motion.h1>

          <motion.p
            className="mt-4 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.14em] text-[var(--red)] md:text-[0.95rem]"
            initial={reduce ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.42 }}
          >
            {site.title}
          </motion.p>

          <motion.p
            className="mt-4 max-w-sm text-sm leading-relaxed text-white/70"
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.5 }}
          >
            {site.bio}
          </motion.p>

          <motion.p
            className="mt-8 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/70"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.62 }}
          >
            <Globe className="h-3.5 w-3.5 text-[var(--red)]" />
            {site.availableLocation}
          </motion.p>
        </div>

        {/* Center gutter reserved for portrait */}
        <div className="hidden lg:block" aria-hidden />

        {/* Right: badge + vertical stats */}
        <div className="flex flex-col items-start gap-10 lg:items-end lg:justify-end">
          <motion.div
            className="flex max-w-[15rem] items-center gap-3"
            initial={reduce ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25">
              <Sparkle className="h-4 w-4 text-[var(--red)]" />
            </span>
            <p className="text-xs leading-relaxed text-white/75">
              {site.heroBadge}
            </p>
          </motion.div>

          <motion.div
            className="flex w-full max-w-[14rem] flex-col gap-6"
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.55 }}
          >
            {site.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.62 + i * 0.1 }}
              >
                <p className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none text-[var(--red)] md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[0.68rem] uppercase tracking-[0.16em] text-white/80">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
