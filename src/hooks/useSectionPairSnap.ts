"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { smoothScrollToElement } from "@/lib/smoothScroll";

const SCROLL_DURATION_MS = 1000;

type SectionPairSnapOptions = {
  upperId: string;
  lowerId: string;
  lockMs?: number;
};

export function useSectionPairSnap({
  upperId,
  lowerId,
  lockMs = 900,
}: SectionPairSnapOptions) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 768px)");
    if (!desktopMq.matches) return;

    const upper = document.getElementById(upperId);
    const lower = document.getElementById(lowerId);
    if (!upper || !lower) return;

    let locked = false;
    let touchStartY = 0;

    const lock = () => {
      locked = true;
      window.setTimeout(() => {
        locked = false;
      }, lockMs);
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

    const inUpperZone = () => {
      const rect = upper.getBoundingClientRect();
      return rect.top < 120 && rect.bottom > window.innerHeight * 0.4;
    };

    const atLowerTop = () => {
      const lowerTop = lower.getBoundingClientRect().top;
      return lowerTop > -80 && lowerTop < 140;
    };

    const onWheel = (event: WheelEvent) => {
      if (locked) {
        event.preventDefault();
        return;
      }

      if (event.deltaY > 16 && inUpperZone()) {
        event.preventDefault();
        snapTo(lower);
        return;
      }

      if (event.deltaY < -16 && atLowerTop()) {
        event.preventDefault();
        snapTo(upper);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - endY;

      if (delta > 55 && inUpperZone()) {
        snapTo(lower);
      } else if (delta < -55 && atLowerTop()) {
        snapTo(upper);
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
  }, [upperId, lowerId, lockMs, reduced]);
}
