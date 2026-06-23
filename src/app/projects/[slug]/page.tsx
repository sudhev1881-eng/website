import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import {
  getAllProjectCategorySlugs,
  getProjectCategoryBySlug,
} from "@/data/projects";
import { site } from "@/data/site";
import { LightHeader } from "@/components/layout/LightHeader";
import { ProjectVideo } from "@/components/projects/ProjectVideo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllProjectCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getProjectCategoryBySlug(slug);
  if (!category) return { title: "Project not found" };

  return {
    title: `${category.title} — ${site.firstName}`,
    description: category.description,
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getProjectCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <>
      <LightHeader />
      <main className="min-h-screen bg-[#FAFAFA]">
        <article className="mx-auto max-w-[1120px] px-6 py-12 lg:py-16">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-wide text-[#999] uppercase">
              {category.chapter} · Track {category.number}
            </p>
            <h1 className="mt-3 text-4xl font-normal tracking-[-0.02em] text-[#1a1a1a] md:text-5xl">
              {category.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[#666]">
              {category.description}
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {category.projects.map((project) => (
              <section
                key={project.title}
                className="rounded-2xl border border-[#E8E8E8] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-normal text-[#1a1a1a]">
                    {project.title}
                  </h2>
                  {project.year && (
                    <span className="font-mono text-[11px] text-[#999]">
                      {project.year}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-[#555]">
                  {project.summary}
                </p>
                {project.video && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-[#E8E8E8]">
                    <ProjectVideo src={project.video} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-3 py-1 text-[12px] text-[#555]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                {project.link && (
                  <div className="mt-3">
                    <Link
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[13px] text-[#1a1a1a] underline underline-offset-4 hover:text-[#000]"
                    >
                      View details
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}
