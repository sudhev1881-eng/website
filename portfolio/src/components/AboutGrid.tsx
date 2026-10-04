"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Code2,
  Lightbulb,
  Pencil,
  Search,
  Send,
} from "lucide-react";
import { site } from "@/data/site";
import { Reveal, Stagger, StaggerItem } from "./Motion";

const processIcons = [Search, Lightbulb, Pencil, Code2, Send];

export function AboutGrid() {
  const reduce = useReducedMotion();

  return (
    <section
      id="about"
      className="border-t border-white/8 bg-[linear-gradient(180deg,#050505_0%,#0a0708_50%,#050505_100%)] px-5 py-20 md:px-10 md:py-28 lg:px-14"
    >
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-3 lg:gap-10">
        <Reveal>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase tracking-wide text-white">
              Education
            </h2>
            <div className="mt-6 border-l-2 border-[var(--red)] pl-4">
              <p className="text-sm font-semibold text-white">
                {site.education.school}
              </p>
              <p className="mt-2 text-sm text-[var(--red)]">
                {site.education.degree}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/55">
                {site.education.years}
              </p>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Focus: {site.education.focus}
              </p>
            </div>

            <h3 className="mt-12 font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase tracking-wide text-white">
              Skills
            </h3>
            <Stagger className="mt-5 flex flex-wrap gap-2" delay={0.1}>
              {site.skills.map((skill) => (
                <StaggerItem key={skill}>
                  <motion.span
                    className="skill-pill"
                    whileHover={
                      reduce
                        ? undefined
                        : { y: -3, scale: 1.04, borderColor: "rgba(225,29,46,0.7)" }
                    }
                  >
                    {skill}
                  </motion.span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase tracking-wide text-white">
              Work Process
            </h2>
            <ol className="relative mt-8 space-y-0">
              <motion.div
                className="absolute bottom-3 left-[15px] top-3 w-px origin-top bg-[var(--red)]/40"
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
              {site.process.map((item, index) => {
                const Icon = processIcons[index] ?? Search;
                return (
                  <motion.li
                    key={item.step}
                    className="relative flex gap-4 pb-8 last:pb-0"
                    initial={reduce ? false : { opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{
                      duration: 0.55,
                      delay: index * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <motion.div
                      className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--red)]/50 bg-[#0d0d0d] text-[var(--red)]"
                      whileHover={reduce ? undefined : { scale: 1.1, rotate: 6 }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </motion.div>
                    <div>
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--red)]">
                        {item.step} — {item.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {item.detail}
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </Reveal>

        <Reveal delay={0.14} className="flex flex-col justify-between gap-8">
          <div>
            <motion.p
              className="font-[family-name:var(--font-display)] text-7xl leading-none text-[var(--red)]"
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              “
            </motion.p>
            <blockquote className="-mt-6 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug text-white md:text-3xl">
              {site.quote}
            </blockquote>
            <p className="mt-6 font-[family-name:var(--font-script)] text-3xl text-white/90">
              {site.firstName}.
            </p>
          </div>

          <motion.a
            href="#contact"
            className="block bg-[var(--red)] px-6 py-8 text-center font-[family-name:var(--font-display)] text-sm font-extrabold uppercase tracking-[0.12em] text-white md:text-base"
            whileHover={reduce ? undefined : { scale: 1.02, y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.25 }}
          >
            Let&apos;s create something great together.
          </motion.a>
        </Reveal>
      </div>
    </section>
  );
}
