"use client";

import { highlightKeywords } from "./derive";
import { cn } from "@/lib/utils";

export function KeywordText({
  text,
  className,
  as: Comp = "p",
}: {
  text: string;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  const parts = highlightKeywords(text);
  return (
    <Comp className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={`${part.text}-${i}`}
            className="rounded-[2px] bg-primary/10 px-0.5 text-inherit [box-decoration-break:clone]"
          >
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${i}`}>{part.text}</span>
        ),
      )}
    </Comp>
  );
}

export function SectionHeading({
  id,
  title,
  description,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-6", className)}>
      <h2 id={id} className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

export function ConfidenceMeter({
  value,
  label = "Confidence",
}: {
  value: number;
  label?: string;
}) {
  return (
    <div className="mt-3" aria-label={`${label}: ${value}%`}>
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-border/80">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
