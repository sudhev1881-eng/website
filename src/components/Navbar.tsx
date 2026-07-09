"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { site } from "@/data/site";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { expandTransition } from "@/lib/motion";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(site.nav[0]?.label ?? "");

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-[#ECECEC] bg-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="outline-none focus-visible:ring-1 focus-visible:ring-[#CCC]"
            aria-label="SMA — Sudhev Mathew Abi home"
          >
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-[#E8E8E8] bg-[#F7F7F7] px-1.5 py-1 md:flex">
            <Link
              href="#projects"
              onMouseEnter={() => setActiveNav("Work")}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-[13px] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none focus-visible:ring-1 focus-visible:ring-[#CCC]",
                activeNav === "Work"
                  ? "bg-[#F0F0F0] text-[#1a1a1a]"
                  : "text-[#999] hover:text-[#1a1a1a]"
              )}
            >
              Work
            </Link>
            {site.nav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => setActiveNav(link.label)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[14px] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none focus-visible:ring-1 focus-visible:ring-[#CCC]",
                  activeNav === link.label
                    ? "bg-[#F0F0F0] text-[#1a1a1a]"
                    : "text-[#666] hover:text-[#1a1a1a]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {site.secondaryNav.map((link) => (
              <Button key={link.label} href={link.href} variant="ghost">
                {link.label}
              </Button>
            ))}
            <Link
              href="#contact"
              className="px-2 text-[14px] text-[#666] transition-colors duration-150 hover:text-[#1a1a1a]"
            >
              {site.contactLabel}
            </Link>
            <Button href="#contact" variant="primary" className="!rounded-full !px-4 !py-2 !text-[13px]">
              {site.hireLabel}
            </Button>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E8E8] bg-white text-[#1a1a1a] md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={expandTransition}
              className="fixed top-16 right-4 left-4 z-50 flex flex-col gap-1 rounded-2xl border border-[#E8E8E8] bg-white p-3 shadow-lg md:hidden"
            >
              <Link
                href="#projects"
                onClick={() => setMobileOpen(false)}
                className="rounded-full px-3 py-2.5 font-mono text-[11px] tracking-wide text-[#999] uppercase hover:bg-[#F5F5F5] hover:text-[#1a1a1a]"
              >
                Work
              </Link>
              {site.nav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full px-3 py-2.5 text-[15px] text-[#555] hover:bg-[#F5F5F5] hover:text-[#1a1a1a]"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-2 border-[#EEE]" />
              {site.secondaryNav.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full px-3 py-2.5 text-[15px] text-[#555] hover:bg-[#F5F5F5] hover:text-[#1a1a1a]"
                >
                  {link.label}
                </Link>
              ))}
              <Button
                href="#contact"
                variant="primary"
                className="mt-2 w-full"
                onClick={() => setMobileOpen(false)}
              >
                {site.hireLabel}
              </Button>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
