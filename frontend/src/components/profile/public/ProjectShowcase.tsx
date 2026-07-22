"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ExternalLink, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fileUrl, type PublicProfile } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { KeywordText, SectionHeading } from "./shared";

type Project = PublicProfile["projects"][number];

function ProjectMedia({ title, image }: { title: string; image: string | null }) {
  const src = fileUrl(image);
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div
        className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#0f172a_0%,#1e293b_50%,#2563eb33_100%)]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:18px_18px]" />
        <Layers className="relative h-10 w-10 text-white/50" />
        <span className="sr-only">No preview for {title}</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = React.useState(Boolean(project.featured));
  const long = (project.description?.length ?? 0) > 140;
  const preview =
    long && !open ? `${project.description.slice(0, 140).trim()}…` : project.description;

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-hover",
        "motion-reduce:transform-none motion-reduce:transition-none",
      )}
    >
      <ProjectMedia title={project.title} image={project.image} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{project.title}</h3>
          {project.featured ? (
            <Badge variant="primary" className="shrink-0 rounded-md">
              Featured
            </Badge>
          ) : null}
        </div>
        {preview ? (
          <div className="mt-2">
            <KeywordText text={preview} className="text-sm leading-relaxed text-muted-foreground" />
            {long ? (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? "Show less" : "Read more"}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
        ) : null}
        {project.tech.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {project.tech.map((t) => (
              <li key={t}>
                <Badge variant="outline" className="rounded-md font-normal">
                  {t}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {project.url && project.url !== "#" ? (
          <Button variant="ghost" size="sm" className="mt-4 px-0" href={project.url}>
            View project
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function ProjectShowcase({ projects }: { projects: Project[] }) {
  const motionSafe = useSafeMotion();
  if (projects.length === 0) return null;

  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));

  return (
    <motion.section aria-labelledby="projects-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="projects-heading"
        title="Projects"
        description="Selected work — stack, outcomes, and links."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {ordered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </motion.section>
  );
}
