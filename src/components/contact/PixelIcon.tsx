import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const size = 32;

type PixelIconName = "phone" | "email" | "linkedin" | "instagram";

export function PixelIcon({
  name,
  className,
}: {
  name: PixelIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {icons[name]}
    </svg>
  );
}

const px = (x: number, y: number, w = 1, h = 1, fill = "currentColor") => (
  <rect key={`${x}-${y}-${w}-${h}`} x={x} y={y} width={w} height={h} fill={fill} />
);

const icons: Record<PixelIconName, ReactNode> = {
  phone: (
    <>
      {px(5, 2, 6, 1, "#34d399")}
      {px(4, 3, 1, 8, "#34d399")}
      {px(11, 3, 1, 8, "#34d399")}
      {px(5, 11, 6, 1, "#34d399")}
      {px(6, 12, 4, 1, "#34d399")}
      {px(7, 5, 2, 4, "#6ee7b7")}
    </>
  ),
  email: (
    <>
      {px(2, 4, 12, 8, "#EA4335")}
      {px(3, 5, 10, 1, "#f87171")}
      {px(4, 6, 8, 1, "#fca5a5")}
      {px(5, 7, 6, 1, "#fff")}
      {px(7, 8, 2, 2, "#EA4335")}
    </>
  ),
  linkedin: (
    <>
      {px(2, 2, 12, 12, "#0A66C2")}
      {px(4, 6, 2, 6, "#fff")}
      {px(4, 4, 2, 2, "#fff")}
      {px(8, 6, 2, 6, "#fff")}
      {px(10, 8, 2, 4, "#fff")}
      {px(8, 6, 2, 2, "#fff")}
    </>
  ),
  instagram: (
    <>
      {px(2, 2, 12, 12, "#E1306C")}
      {px(3, 3, 10, 10, "#831843")}
      {px(6, 6, 4, 4, "#F77737")}
      {px(7, 7, 2, 2, "#fce7f3")}
      {px(10, 4, 2, 2, "#fbcfe8")}
    </>
  ),
};
