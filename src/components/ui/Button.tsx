import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1a1a1a] text-white hover:bg-[#333] focus-visible:ring-[#CCC]",
  secondary:
    "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border border-white/25 hover:bg-white/20 backdrop-blur-md",
  outline:
    "border border-[#D4D4D4] bg-white text-[#1a1a1a] hover:border-[#AAA] hover:bg-[#FAFAFA] focus-visible:ring-[#CCC]",
  ghost:
    "rounded-full border border-[#E5E5E5] bg-white/80 px-4 py-1.5 text-[13px] text-[#555] backdrop-blur-sm hover:border-[#CCC] hover:text-[#1a1a1a]",
};

const base =
  "inline-flex items-center justify-center rounded-full text-[14px] font-normal transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none focus-visible:ring-1 px-5 py-2.5";

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className,
  type = "button",
}: ButtonProps) {
  const classes = cn(base, variants[variant], className);

  if (href) {
    const isExternal = href.startsWith("http");
    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
