import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassPillProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "nav";
}

export function GlassPill({
  children,
  className,
  as: Component = "div",
}: GlassPillProps) {
  return (
    <Component className={cn("glass-pill glass-surface", className)}>
      {children}
    </Component>
  );
}
