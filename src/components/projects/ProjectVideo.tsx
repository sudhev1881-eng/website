"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProjectVideoProps {
  src: string;
  className?: string;
}

export function ProjectVideo({ src, className }: ProjectVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, [src]);

  return (
    <div
      className={cn(
        "flex aspect-video w-full items-center justify-center bg-black",
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controlsList="nodownload noplaybackrate nofullscreen"
        disablePictureInPicture
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none h-full w-full scale-[0.92] object-contain [&::-webkit-media-controls]:!hidden [&::-webkit-media-controls-enclosure]:!hidden"
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
