import { cn } from "@/lib/utils";

interface GlassPillProps {
  children: React.ReactNode;
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
