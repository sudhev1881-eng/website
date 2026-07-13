import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

function SkeletonText({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 w-full", i === lines - 1 && lines > 1 && "w-4/5")}
        />
      ))}
    </div>
  );
}

function SkeletonCircle({ className }: { className?: string }) {
  return <Skeleton className={cn("h-12 w-12 rounded-full", className)} />;
}

function SkeletonRect({ className }: { className?: string }) {
  return <Skeleton className={cn("h-32 w-full rounded-2xl", className)} />;
}

export { Skeleton, SkeletonText, SkeletonCircle, SkeletonRect };
