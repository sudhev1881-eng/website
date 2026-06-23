"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { smoothScrollToElement } from "@/lib/smoothScroll";

const SNAP_LOCK_MS = 1100;
const SCROLL_DURATION_MS = 1050;

export function useHeroSectionSnap() {
  const reduced = useReducedMotion();

  useEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 768px)");
    if (!desktopMq.matches) return;

    const hero = document.getElementById("hero");
    const next = document.getElementById("about");
    if (!hero || !next) return;

    let locked = false;
    let touchStartY = 0;

    const lock = () => {
      locked = true;
      window.setTimeout(() => {
        locked = false;
      }, SNAP_LOCK_MS);
    };

    const snapTo = (target: HTMLElement) => {
      if (locked) return;
      lock();
      if (reduced) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
      smoothScrollToElement(target, { duration: SCROLL_DURATION_MS });
    };

    const inHeroZone = () => {
      const heroBottom = hero.getBoundingClientRect().bottom;
      return window.scrollY < window.innerHeight * 0.9 && heroBottom > window.innerHeight * 0.35;
    };

    const atAboutTop = () => {
      const nextTop = next.getBoundingClientRect().top;
      return nextTop > -80 && nextTop < 140;
    };

    const onWheel = (event: WheelEvent) => {
      if (locked) {
        event.preventDefault();
        return;
      }

      if (event.deltaY > 16 && inHeroZone()) {
        event.preventDefault();
        snapTo(next);
        return;
      }

      if (event.deltaY < -16 && atAboutTop()) {
        event.preventDefault();
        snapTo(hero);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - endY;

      if (delta > 55 && inHeroZone()) {
        snapTo(next);
      } else if (delta < -55 && atAboutTop()) {
        snapTo(hero);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [reduced]);
}
