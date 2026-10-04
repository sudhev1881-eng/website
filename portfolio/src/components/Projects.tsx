"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/data/site";
import { Reveal } from "./Motion";

export function Projects() {
  return (
    <section id="projects" className="border-t border-white/8 px-5 py-20 md:px-10 md:py-28 lg:px-14">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase tracking-[-0.02em] text-white md:text-5xl">
            Selected Projects
          </h2>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/70 transition hover:text-[var(--red)]"
          >
            View all projects
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3">
          {site.projects.map((project, index) => (
            <Reveal key={project.id} delay={index * 0.08}>
              <article className="project-card group flex h-full flex-col">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#111]">
                  <Image
                    src={project.image}
                    alt={`${project.name} preview`}
                    fill
                    unoptimized
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 font-[family-name:var(--font-display)] text-sm font-bold text-[var(--red)]">
                    {project.id}
                  </span>
                  <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                    {project.status}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-white">
                        {project.name}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--red)]">
                        {project.subtitle}
                      </p>
                    </div>
                    <span className="mt-1 inline-flex h-9 w-9 items-center justify-center border border-white/15 text-white/70 transition group-hover:border-[var(--red)] group-hover:text-[var(--red)]">
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
                        className="border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] text-white/65"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
