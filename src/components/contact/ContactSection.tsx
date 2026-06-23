"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { PixelIcon } from "@/components/contact/PixelIcon";
import { contactChannels, contactSection } from "@/data/contact";
import { cn } from "@/lib/utils";
import { itemTransition, sectionTransition } from "@/lib/motion";

export function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section
      id="contact"
      className="relative overflow-hidden px-4 pt-24 pb-14 text-[#1a1a1a] sm:px-6 sm:pt-28 sm:pb-16 lg:snap-start lg:snap-always lg:pt-36 lg:pb-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[#7ec8f5]" aria-hidden>
        <img
          src="/images/contact-pixel-bg.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-bottom brightness-[1.15] saturate-[1.5] contrast-[1.06] [image-rendering:pixelated]"
        />
        <div
          className="absolute inset-x-0 top-0 h-[22%]"
          style={{
            background:
              "linear-gradient(to bottom, #F7F7F5 0%, #e8f4fc 26%, #aadcf5 48%, rgba(126, 200, 245, 0.72) 68%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300/10 via-transparent to-transparent" />
      </div>

      <div ref={ref} className="relative z-10 mx-auto max-w-[920px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={sectionTransition}
          className="text-center"
        >
          <p className="font-pixel text-[10px] tracking-[0.28em] text-white/90 drop-shadow-[0_1px_6px_rgba(15,23,42,0.35)] sm:text-[11px]">
            {contactSection.eyebrow.toUpperCase()}
          </p>
          <h2 className="mt-4 font-pixel text-xl leading-relaxed tracking-tight text-white drop-shadow-[0_2px_12px_rgba(15,23,42,0.35)] sm:text-2xl md:text-[1.75rem]">
            {contactSection.title}
          </h2>
          <p className="mx-auto mt-5 max-w-lg font-mono text-[13px] leading-relaxed text-white/90 drop-shadow-[0_1px_8px_rgba(15,23,42,0.3)] sm:text-[14px]">
            {contactSection.subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            ...sectionTransition,
            duration: 0.9,
            delay: 0.1,
          }}
          className="mt-12 rounded-sm border-2 border-white/70 bg-white/40 p-1 shadow-[6px_6px_0_rgba(255,255,255,0.25)] backdrop-blur-[2px] sm:mt-14 sm:border-4 sm:shadow-[8px_8px_0_rgba(255,255,255,0.25)]"
        >
          <div className="border-2 border-white/50 bg-white/40 p-4 backdrop-blur-[2px] sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b-2 border-dashed border-[#CBD5E1] pb-4">
              <span className="font-pixel text-[9px] text-emerald-600 sm:text-[10px]">
                ● ONLINE
              </span>
              <span className="font-pixel text-[9px] text-[#64748B] sm:text-[10px]">
                PRESS TO CONNECT
              </span>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {contactChannels.map((channel, index) => {
                const isActive = activeId === channel.id;
                const isExternal = channel.href.startsWith("http");

                return (
                  <motion.li
                    key={channel.id}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -12 : 12 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{
                      ...itemTransition,
                      delay: 0.15 + index * 0.08,
                    }}
                  >
                    <a
                      href={channel.href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      onMouseEnter={() => setActiveId(channel.id)}
                      onMouseLeave={() => setActiveId(null)}
                      onFocus={() => setActiveId(channel.id)}
                      onBlur={() => setActiveId(null)}
                      className={cn(
                        "group flex items-center gap-3 rounded-sm border-2 border-white/80 bg-white/60 p-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none backdrop-blur-[1px] sm:gap-4 sm:p-4",
                        "hover:-translate-y-1",
                        channel.theme.hoverBorder,
                        channel.theme.hoverShadow,
                        "focus-visible:-translate-y-1",
                        isActive &&
                          cn(
                            "-translate-y-1",
                            channel.theme.activeBorder,
                            channel.theme.activeShadow
                          )
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border-2 transition-colors sm:h-14 sm:w-14",
                          channel.theme.iconBox
                        )}
                      >
                        <PixelIcon name={channel.icon} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-pixel text-[9px] tracking-wider sm:text-[10px]",
                            channel.theme.label
                          )}
                        >
                          {channel.label}
                        </p>
                        <p className="mt-2 truncate font-mono text-[13px] text-[#1a1a1a] sm:text-[14px]">
                          {channel.value}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded-sm border-2 border-[#CBD5E1] px-2 py-1 font-pixel text-[8px] text-[#64748B] transition-colors sm:text-[9px]",
                          channel.theme.action
                        )}
                      >
                        {channel.action}
                      </span>
                    </a>
                  </motion.li>
                );
              })}
            </ul>

            <p className="mt-6 text-center font-mono text-[11px] text-[#64748B]">
              {contactSection.footer}
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8 text-center font-pixel text-[8px] tracking-widest text-white/70 drop-shadow-[0_1px_6px_rgba(15,23,42,0.35)] sm:text-[9px]"
        >
          © {new Date().getFullYear()} SUDHEV MATHEW ABI
        </motion.p>
      </div>
    </section>
  );
}
