"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Globe } from "lucide-react";
import { site } from "@/data/site";
import { FadeIn } from "./Motion";

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-atmosphere px-5 pb-16 pt-6 md:px-10 lg:px-14">
      <div className="relative z-20 mx-auto flex max-w-7xl items-start justify-between gap-4 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/75 md:text-xs">
        <p>Computer Engineering / Developer</p>
        <p className="flex items-center gap-2 text-right">
          <span className="inline-block h-1.5 w-1.5 rotate-45 bg-[var(--red)]" />
          {site.available}
        </p>
      </div>

      <FadeIn className="pointer-events-none absolute inset-x-0 top-[8%] z-0 select-none overflow-hidden px-2 md:top-[6%]">
        <p className="portfolio-watermark mx-auto max-w-[100vw] text-center text-[18vw] md:text-[15vw]">
          PORTFOLIO
        </p>
      </FadeIn>

      <div className="relative z-10 mx-auto mt-8 grid max-w-7xl items-end gap-8 lg:mt-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="order-2 max-w-xl lg:order-1 lg:pb-10">
          <motion.p
            className="font-[family-name:var(--font-script)] text-3xl text-white md:text-4xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            Hello, I&apos;m
          </motion.p>

          <motion.h1
            className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-[0.92] tracking-[-0.03em] text-white sm:text-6xl md:text-7xl"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.25 }}
          >
            {site.name}
          </motion.h1>

          <motion.p
            className="mt-4 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.14em] text-[var(--red)] md:text-base"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            {site.title}
          </motion.p>

          <motion.p
            className="mt-5 max-w-md text-sm leading-relaxed text-[var(--text-muted)] md:text-[0.95rem]"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
          >
            {site.bio}
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            <a href="#projects" className="cta-pill">
              View Projects
            </a>
            <a href="#contact" className="cta-outline">
              Let&apos;s Talk
            </a>
          </motion.div>

          <motion.p
            className="mt-10 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/70"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.7 }}
          >
            <Globe className="h-3.5 w-3.5 text-[var(--red)]" />
            {site.availableLocation}
          </motion.p>
        </div>

        <div className="relative order-1 flex flex-col items-center lg:order-2">
          <motion.div
            className="relative w-full max-w-[560px]"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <div className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(225,29,46,0.28),transparent_65%)] blur-2xl" />
            <Image
              src="/images/portrait.png"
              alt={`${site.name} portrait`}
              width={1671}
              height={941}
              priority
              className="relative z-10 mx-auto h-auto w-full object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
            />
          </motion.div>

          <motion.div
            className="mt-6 hidden w-full max-w-[560px] grid-cols-3 gap-3 border-t border-white/10 pt-6 lg:grid"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
          >
            {site.stats.map((stat) => (
              <div key={stat.label} className="text-left">
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--red)] md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/65 md:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="order-3 grid w-full grid-cols-3 gap-3 border-t border-white/10 pt-6 lg:hidden"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
        >
          {site.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[var(--red)]">
                {stat.value}
              </p>
              <p className="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/65">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
