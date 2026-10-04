"use client";

import Image from "next/image";
import { Code2, Link2, Mail, MapPin, Globe } from "lucide-react";
import { site } from "@/data/site";
import { Reveal } from "./Motion";

export function Contact() {
  return (
    <section
      id="contact"
      className="border-t border-white/8 px-5 py-20 md:px-10 md:py-28 lg:px-14"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_0.9fr_1fr] lg:items-end lg:gap-10">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-[0.95] tracking-[-0.03em] text-white sm:text-5xl md:text-6xl">
            Let&apos;s work
            <br />
            together
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
            Open to freelance work, collaborations, and building useful products
            across AI, cybersecurity, and the web.
          </p>
          <div className="mt-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--red)] bg-[var(--red)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white">
              <span className="h-1.5 w-1.5 rotate-45 bg-white" />
              {site.available}
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="space-y-5">
            <li>
              <a
                href={`mailto:${site.contact.email}`}
                className="group flex items-center gap-4 text-sm text-white/85 transition hover:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 group-hover:border-[var(--red)]">
                  <Mail className="h-4 w-4 text-[var(--red)]" />
                </span>
                {site.contact.email}
              </a>
            </li>
            <li>
              <a
                href={site.contact.github}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 text-sm text-white/85 transition hover:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 group-hover:border-[var(--red)]">
                  <Code2 className="h-4 w-4 text-[var(--red)]" />
                </span>
                GitHub
              </a>
            </li>
            <li>
              <a
                href={site.contact.linkedin}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-4 text-sm text-white/85 transition hover:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 group-hover:border-[var(--red)]">
                  <Link2 className="h-4 w-4 text-[var(--red)]" />
                </span>
                LinkedIn
              </a>
            </li>
            <li className="flex items-center gap-4 text-sm text-white/85">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15">
                <MapPin className="h-4 w-4 text-[var(--red)]" />
              </span>
              {site.contact.location}
            </li>
            <li className="flex items-center gap-4 text-sm text-white/85">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15">
                <Globe className="h-4 w-4 text-[var(--red)]" />
              </span>
              {site.contact.website}
            </li>
          </ul>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="relative aspect-[9/7] overflow-hidden border border-white/10 bg-[#111]">
            <Image
              src="/images/workspace.svg"
              alt="Developer workspace"
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
          </div>
        </Reveal>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-3 border-t border-white/8 pt-8 text-xs uppercase tracking-[0.14em] text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {site.name}</p>
        <p>Built with Next.js</p>
      </div>
    </section>
  );
}
