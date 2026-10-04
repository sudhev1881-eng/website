"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { Reveal, Stagger, StaggerItem } from "./Motion";

export function Projects() {
  const reduce = useReducedMotion();

  return (
    <section
      id="projects"
      className="relative border-t border-white/8 px-5 py-20 md:px-10 md:py-28 lg:px-14"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="relative mx-auto max-w-7xl">
        <Reveal className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase tracking-[-0.02em] text-white md:text-5xl">
            Selected Projects
          </h2>
          <motion.a
            href="#contact"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/70 transition hover:text-[var(--red)]"
            whileHover={reduce ? undefined : { x: 4 }}
          >
            View all projects
            <ArrowUpRight className="h-4 w-4" />
          </motion.a>
        </Reveal>

        <Stagger className="grid gap-6 lg:grid-cols-3" delay={0.05}>
          {site.projects.map((project) => (
            <StaggerItem key={project.id}>
              <motion.article
                className="project-card group flex h-full flex-col"
                whileHover={
                  reduce
                    ? undefined
                    : { y: -8, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
                }
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#111]">
                  <motion.div
                    className="absolute inset-0"
                    whileHover={reduce ? undefined : { scale: 1.06 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Image
                      src={project.image}
                      alt={`${project.name} preview`}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  </motion.div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 font-[family-name:var(--font-display)] text-sm font-bold text-[var(--red)]">
                    {project.id}
                  </span>
                  <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                    {project.status}
                  </span>
                  <motion.span
                    className="absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center border border-white/20 bg-black/40 text-white backdrop-blur"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ArrowUpRight className="h-4 w-4 text-[var(--red)]" />
                  </motion.span>
                </div>

                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-white transition group-hover:text-[var(--red)]">
                        {project.name}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--red)]">
                        {project.subtitle}
                      </p>
                    </div>
                    <span className="mt-1 inline-flex h-9 w-9 items-center justify-center border border-white/15 text-white/70 transition duration-300 group-hover:rotate-45 group-hover:border-[var(--red)] group-hover:text-[var(--red)]">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
                    {project.description}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-white/55">
                    {project.role}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.stack.map((tech) => (
                      <span
                        key={tech}
                        className="border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] text-white/65 transition group-hover:border-white/20"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
