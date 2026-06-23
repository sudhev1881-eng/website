"use client";

import { useReducedMotion } from "framer-motion";

/** Primary site-wide ease — soft ease-out expo */
export const smoothEase = [0.22, 1, 0.36, 1] as const;

/** @deprecated use smoothEase */
export const heroEase = smoothEase;

export const sectionTransition = {
  duration: 0.85,
  ease: smoothEase,
} as const;

export const itemTransition = {
  duration: 0.55,
  ease: smoothEase,
} as const;

export const expandTransition = {
  duration: 0.42,
  ease: smoothEase,
} as const;

export const fadeTransition = {
  duration: 0.4,
  ease: smoothEase,
} as const;

export const smoothSpring = {
  type: "spring" as const,
  stiffness: 240,
  damping: 34,
  mass: 0.9,
};

export const layoutSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 32,
  mass: 0.95,
};

export const scrollSpring = {
  stiffness: 90,
  damping: 28,
  mass: 0.45,
};

export const heroContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.25,
    },
  },
};

export const heroItemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: smoothEase },
  },
};

export function useSafeMotion() {
  const reduced = useReducedMotion();

  return {
    reduced: Boolean(reduced),
    heroItem: reduced
      ? {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: 0.4 },
          },
        }
      : heroItemVariants,
  };
}
