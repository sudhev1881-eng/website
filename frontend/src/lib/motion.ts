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

export const fadeInVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: smoothEase },
  },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: fadeTransition,
};

export const cardHoverTransition = {
  y: -2,
  transition: { duration: 0.25, ease: smoothEase },
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
    fadeIn: reduced
      ? {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.3 } },
        }
      : fadeInVariants,
    stagger: reduced
      ? { hidden: {}, visible: { transition: { staggerChildren: 0 } } }
      : staggerContainer,
    cardHover: reduced ? {} : cardHoverTransition,
    page: reduced
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.2 },
        }
      : pageTransition,
  };
}
