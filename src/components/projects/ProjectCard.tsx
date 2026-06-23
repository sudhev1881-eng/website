"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { ProjectCategory } from "@/data/projects";
import { site } from "@/data/site";
import { expandTransition, itemTransition } from "@/lib/motion";
import { ProjectVideo } from "@/components/projects/ProjectVideo";

interface CategoryCardProps {
  category: ProjectCategory;
  index: number;
}

export function CategoryCard({ category, index }: CategoryCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        ...itemTransition,
        delay: index * 0.08,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex w-full flex-col overflow-hidden rounded-2xl border border-[#E8E8E8] bg-white text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCC]"
      >
        <div className="px-6 pt-6 pb-3">
          <p className="font-mono text-[11px] tracking-wide text-[#999] uppercase">
            {category.chapter} · Track {category.number}
          </p>
          <h3 className="mt-1 text-xl font-normal tracking-[-0.01em] text-[#1a1a1a] md:text-2xl">
            {category.title}
          </h3>
          <p className="mt-1 text-[14px] text-[#888]">{category.subtitle}</p>
        </div>

        <div className="relative mx-6 my-4 aspect-[4/3] overflow-hidden rounded-xl bg-[#F5F5F5]">
          <Image
            src={category.image}
            alt={category.title}
            fill
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div className="border-t border-[#EEE] bg-[#FAFAFA]/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#999]">
              Curated by {site.firstName}
            </span>
            <span className="text-[13px] text-[#666] transition-colors group-hover:text-[#1a1a1a]">
              {open ? "Hide projects ↑" : "View projects ↓"}
            </span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={expandTransition}
              className="border-t border-[#EEE] bg-white px-6 pb-5 pt-3"
            >
              <p className="text-[14px] leading-relaxed text-[#666]">
                {category.description}
              </p>
              <ul className="mt-4 space-y-3">
                {category.projects.map((project) => (
                  <li
                    key={project.title}
                    className="rounded-xl border border-[#EEE] bg-[#FAFAFA] px-4 py-3 text-[14px] text-[#444]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-[#1a1a1a]">
                        {project.title}
                      </span>
                      {project.year && (
                        <span className="font-mono text-[11px] text-[#999]">
                          {project.year}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-[#666]">
                      {project.summary}
                    </p>
                    {project.video && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-[#E6E6E6]">
                        <ProjectVideo src={project.video} />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-full border border-[#E0E0E0] bg-white px-2 py-0.5 text-[11px] text-[#555]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    {project.link && (
                      <div className="mt-2">
                        <Link
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-[#666] underline underline-offset-4 hover:text-[#1a1a1a]"
                        >
                          View details
                        </Link>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  );
}
