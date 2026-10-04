"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Globe, ArrowDown } from "lucide-react";
import { site } from "@/data/site";
import { FadeIn } from "./Motion";

export function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, 160]);
  const bgScale = useTransform(scrollY, [0, 700], [1.05, 1.18]);
  const contentY = useTransform(scrollY, [0, 500], [0, 80]);
  const contentOpacity = useTransform(scrollY, [0, 420], [1, 0.15]);
  const watermarkY = useTransform(scrollY, [0, 600], [0, -60]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      {/* Full-bleed portrait background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={reduce ? undefined : { y: bgY, scale: bgScale }}
      >
        <Image
          src="/images/portrait.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] md:object-[72%_center]"
          aria-hidden
        />
        <div className="hero-overlay absolute inset-0" />
      </motion.div>

      <div className="relative z-20 flex min-h-[100svh] flex-col px-5 pb-10 pt-6 md:px-10 lg:px-14">
        <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-4 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/80 md:text-xs">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Computer Engineering / Developer
          </motion.p>
          <motion.p
            className="flex items-center gap-2 text-right"
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="inline-block h-1.5 w-1.5 animate-pulse rotate-45 bg-[var(--red)]" />
            {site.available}
          </motion.p>
        </div>

        <FadeIn className="pointer-events-none absolute inset-x-0 top-[10%] z-10 select-none overflow-hidden px-2 md:top-[8%]">
          <motion.p
            className="portfolio-watermark mx-auto max-w-[100vw] text-center text-[19vw] md:text-[15.5vw]"
            style={reduce ? undefined : { y: watermarkY }}
          >
            PORTFOLIO
          </motion.p>
        </FadeIn>

        <motion.div
          className="relative z-20 mx-auto mt-auto flex w-full max-w-7xl flex-col gap-10 pb-4 pt-28 lg:flex-row lg:items-end lg:justify-between lg:gap-16"
          style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
        >
          <div className="max-w-xl">
            <motion.p
              className="font-[family-name:var(--font-script)] text-3xl text-white md:text-4xl"
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2 }}
            >
              Hello, I&apos;m
            </motion.p>

            <motion.h1
              className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.03em] text-white sm:text-6xl md:text-7xl lg:text-8xl"
              initial={reduce ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.3 }}
            >
              {site.name}
            </motion.h1>

            <motion.p
              className="mt-4 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.14em] text-[var(--red)] md:text-base"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              {site.title}
            </motion.p>

            <motion.p
              className="mt-5 max-w-md text-sm leading-relaxed text-white/75 md:text-[0.95rem]"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
            >
              {site.bio}
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
            >
              <motion.a
                href="#projects"
                className="cta-pill"
                whileHover={reduce ? undefined : { scale: 1.04, y: -2 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
              >
                View Projects
              </motion.a>
              <motion.a
                href="#contact"
                className="cta-outline"
                whileHover={reduce ? undefined : { scale: 1.03, y: -1 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
              >
                Let&apos;s Talk
              </motion.a>
            </motion.div>

            <motion.p
              className="mt-8 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/70"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.75 }}
            >
              <Globe className="h-3.5 w-3.5 text-[var(--red)]" />
              {site.availableLocation}
            </motion.p>
          </div>

          <motion.div
            className="grid w-full max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-6 lg:max-w-lg"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.7 }}
          >
            {site.stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-left"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.78 + i * 0.08 }}
              >
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--red)] md:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/70 md:text-xs">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.a
          href="#projects"
          className="absolute bottom-5 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-white/55 md:flex"
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1, y: [0, 6, 0] }}
          transition={
            reduce
              ? undefined
              : {
                  opacity: { delay: 1.1, duration: 0.6 },
                  y: { repeat: Infinity, duration: 1.8, ease: "easeInOut" },
                }
          }
        >
          Scroll
          <ArrowDown className="h-3.5 w-3.5 text-[var(--red)]" />
        </motion.a>
      </div>
    </section>
  );
}
