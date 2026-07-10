"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    const sync = () => setMatches(media.matches);
    const frame = requestAnimationFrame(sync);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener("change", handler);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
