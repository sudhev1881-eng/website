import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { projectsSection, projectCategories } from "@/data/projects";
import { CategoryCard } from "@/components/projects/ProjectCard";

export function ProjectsSection() {
  return (
    <section
      id="projects"
      className="relative bg-[#F7F7F5] px-4 py-20 sm:px-6 sm:py-24 lg:py-32"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }}
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-normal tracking-[-0.02em] text-[#1a1a1a] md:text-4xl">
            {projectsSection.title}
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#666]">
            {projectsSection.subtitle}
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
          {projectCategories.map((category, index) => (
            <CategoryCard
              key={category.slug}
              category={category}
              index={index}
            />
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <Link
            href={projectsSection.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] text-[#666] underline decoration-[#CCC] underline-offset-4 transition-colors hover:text-[#1a1a1a]"
          >
            {projectsSection.githubCta}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <p className="flex items-center gap-1 text-[12px] text-[#999]">
            Tap any track to reveal the projects inside
            <ChevronDown className="h-3 w-3" />
          </p>
        </div>
      </div>
    </section>
  );
}
