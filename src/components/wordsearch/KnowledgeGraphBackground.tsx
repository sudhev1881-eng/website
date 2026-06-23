"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const KnowledgeGraphCanvas = dynamic(
  () =>
    import("@/components/wordsearch/knowledge-graph/GraphScene").then(
      (mod) => mod.KnowledgeGraphCanvas
    ),
  { ssr: false }
);

export function KnowledgeGraphBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const pixelLayers = (
    <>
      <img
        src="/images/about-pixel-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center brightness-[1.28] saturate-[1.75] contrast-[1.1] [image-rendering:pixelated]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #4DB8FF 0%, #52b8f5 16%, rgba(82, 184, 245, 0.75) 28%, rgba(82, 184, 245, 0.25) 40%, transparent 52%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.28),transparent_46%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/18 via-transparent to-emerald-400/10" />
    </>
  );

  if (!mounted) {
    return (
      <div className="absolute inset-0 bg-[#52b8f5]" aria-hidden>
        {pixelLayers}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#52b8f5]" aria-hidden>
      {pixelLayers}
      <div className="absolute inset-0 opacity-25">
        <KnowledgeGraphCanvas reducedMotion={reducedMotion} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.14),transparent_32%)]" />
    </div>
  );
}
