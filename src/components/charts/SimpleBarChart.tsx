"use client";

import { cn } from "@/lib/utils";

interface SimpleBarChartProps {
  data: { label: string; value: number; secondary?: number }[];
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function SimpleBarChart({
  data,
  className,
  primaryColor = "bg-primary",
  secondaryColor = "bg-secondary/60",
}: SimpleBarChartProps) {
  const max = Math.max(...data.flatMap((d) => [d.value, d.secondary ?? 0]), 1);

  return (
    <div className={cn("flex h-48 items-end gap-2 sm:gap-3", className)}>
      {data.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full items-end justify-center gap-1" style={{ height: 160 }}>
            {item.secondary !== undefined ? (
              <div
                className={cn("w-2 rounded-t-md sm:w-3", secondaryColor)}
                style={{ height: `${(item.secondary / max) * 100}%`, minHeight: 4 }}
              />
            ) : null}
            <div
              className={cn("w-3 rounded-t-md sm:w-4", primaryColor)}
              style={{ height: `${(item.value / max) * 100}%`, minHeight: 4 }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  color = "bg-primary",
}: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
