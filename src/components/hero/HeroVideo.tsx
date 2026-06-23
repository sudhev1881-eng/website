"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Standard hero loop — bump version when the file changes to bust browser cache. */
const HERO_VIDEO_SRC = "/videos/hero.mp4?v=4";
/** Optional 3840×2160 export; used on large/retina screens when present. */
const HERO_VIDEO_4K_SRC = "/videos/hero-4k.mp4?v=1";

function pickHeroSrc(): string {
  if (typeof window === "undefined") return HERO_VIDEO_SRC;
  const wideScreen = window.matchMedia("(min-width: 1280px)").matches;
  const retina = window.devicePixelRatio >= 1.5;
  return wideScreen && retina ? HERO_VIDEO_4K_SRC : HERO_VIDEO_SRC;
}

interface HeroVideoProps {
  className?: string;
}

export function HeroVideo({ className }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState(HERO_VIDEO_SRC);

  useEffect(() => {
    const preferred = pickHeroSrc();

    if (preferred === HERO_VIDEO_SRC) {
      setSrc(HERO_VIDEO_SRC);
      return;
    }

    let cancelled = false;

    fetch(preferred, { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        setSrc(res.ok ? preferred : HERO_VIDEO_SRC);
      })
      .catch(() => {
        if (!cancelled) setSrc(HERO_VIDEO_SRC);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const play = () => {
      void video.play().catch(() => {});
    };

    play();
    video.addEventListener("canplay", play);

    return () => video.removeEventListener("canplay", play);
  }, [src]);

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center overflow-hidden bg-[#e8f4fc]",
        className
      )}
    >
      <video
        key={src}
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controlsList="nodownload noplaybackrate nofullscreen"
        disablePictureInPicture
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none h-full w-full min-h-full min-w-full object-cover object-[center_42%] [image-rendering:auto] [transform:translateZ(0)] sm:object-[center_40%] md:object-center [&::-webkit-media-controls]:!hidden [&::-webkit-media-controls-enclosure]:!hidden"
      />
    </div>
  );
}
