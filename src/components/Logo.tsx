import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-2.5 transition-opacity hover:opacity-90",
        className
      )}
    >
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] shadow-[0_1px_2px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.1)] transition-transform duration-200 group-hover:scale-[1.04]"
        aria-hidden
      >
        <span className="font-serif text-[1.35rem] leading-none text-white">S</span>
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#7ec8f5]" />
      </span>

      <span className="flex min-w-0 flex-col leading-none">
        <span className="translate-y-[2mm] font-serif text-[1.05rem] tracking-[0.14em] text-[#1a1a1a] sm:text-[1.125rem]">
          SMA
        </span>
      </span>
    </span>
  );
}
