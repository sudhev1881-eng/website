"use client";

import {
  Code2,
  Lightbulb,
  Pencil,
  Search,
  Send,
} from "lucide-react";
import { site } from "@/data/site";
import { Reveal } from "./Motion";

const processIcons = [Search, Lightbulb, Pencil, Code2, Send];

export function AboutGrid() {
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
            <div className="mt-5 flex flex-wrap gap-2">
              {site.skills.map((skill) => (
                <span key={skill} className="skill-pill">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase tracking-wide text-white">
              Work Process
            </h2>
            <ol className="relative mt-8 space-y-0">
              <div className="absolute bottom-3 left-[15px] top-3 w-px bg-white/10" />
              {site.process.map((item, index) => {
                const Icon = processIcons[index] ?? Search;
                return (
                  <li key={item.step} className="relative flex gap-4 pb-8 last:pb-0">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--red)]/50 bg-[#0d0d0d] text-[var(--red)]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[var(--red)]">
                        {item.step} — {item.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Reveal>

        <Reveal delay={0.18} className="flex flex-col justify-between gap-8">
          <div>
            <p className="font-[family-name:var(--font-display)] text-7xl leading-none text-[var(--red)]">
              “
            </p>
            <blockquote className="-mt-6 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug text-white md:text-3xl">
              {site.quote}
            </blockquote>
            <p className="mt-6 font-[family-name:var(--font-script)] text-3xl text-white/90">
              {site.firstName}.
            </p>
          </div>

          <a
            href="#contact"
            className="block bg-[var(--red)] px-6 py-8 text-center font-[family-name:var(--font-display)] text-sm font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-[#c41222] md:text-base"
          >
            Let&apos;s create something great together.
          </a>
        </Reveal>
      </div>
    </section>
  );
}
