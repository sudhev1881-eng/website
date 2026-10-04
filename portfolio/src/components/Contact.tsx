"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Code2, Link2, Mail, MapPin, Globe } from "lucide-react";
import { site } from "@/data/site";
import { Reveal, Stagger, StaggerItem } from "./Motion";

const contactItems = [
  {
    label: site.contact.email,
    href: `mailto:${site.contact.email}`,
    icon: Mail,
    external: false,
  },
  {
    label: "GitHub",
    href: site.contact.github,
    icon: Code2,
    external: true,
  },
  {
    label: "LinkedIn",
    href: site.contact.linkedin,
    icon: Link2,
    external: true,
  },
  {
    label: site.contact.location,
    href: null,
    icon: MapPin,
    external: false,
  },
  {
    label: site.contact.website,
    href: null,
    icon: Globe,
    external: false,
  },
] as const;

export function Contact() {
  const reduce = useReducedMotion();

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
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-[var(--red)] bg-[var(--red)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white"
              animate={
                reduce
                  ? undefined
                  : {
                      boxShadow: [
                        "0 0 0 0 rgba(225,29,46,0.35)",
                        "0 0 0 12px rgba(225,29,46,0)",
                      ],
                    }
              }
              transition={
                reduce
                  ? undefined
                  : { duration: 2.2, repeat: Infinity, ease: "easeOut" }
              }
            >
              <span className="h-1.5 w-1.5 rotate-45 bg-white" />
              {site.available}
            </motion.span>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <Stagger className="space-y-5" delay={0.05}>
            {contactItems.map((item) => {
              const Icon = item.icon;
              const inner = (
                <>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition group-hover:border-[var(--red)] group-hover:bg-[var(--red)]/10">
                    <Icon className="h-4 w-4 text-[var(--red)]" />
                  </span>
                  {item.label}
                </>
              );

              return (
                <StaggerItem key={item.label}>
                  {item.href ? (
                    <motion.a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                      className="group flex items-center gap-4 text-sm text-white/85 transition hover:text-white"
                      whileHover={reduce ? undefined : { x: 6 }}
                    >
                      {inner}
                    </motion.a>
                  ) : (
                    <div className="group flex items-center gap-4 text-sm text-white/85">
                      {inner}
                    </div>
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
        </Reveal>

        <Reveal delay={0.14}>
          <motion.div
            className="relative aspect-[9/7] overflow-hidden border border-white/10 bg-[#111]"
            whileHover={reduce ? undefined : { scale: 1.015 }}
            transition={{ duration: 0.4 }}
          >
            <Image
              src="/images/workspace.svg"
              alt="Developer workspace"
              fill
              unoptimized
              className="object-cover transition duration-700 hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 33vw"
            />
          </motion.div>
        </Reveal>
      </div>

      <div className="mx-auto mt-16 flex max-w-7xl flex-col gap-3 border-t border-white/8 pt-8 text-xs uppercase tracking-[0.14em] text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}
        </p>
        <p>Built with Next.js</p>
      </div>
    </section>
  );
}
