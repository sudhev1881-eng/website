import Link from "next/link";
import { site } from "@/data/site";

interface LightHeaderProps {
  backHref?: string;
  backLabel?: string;
}

export function LightHeader({
  backHref = "/#projects",
  backLabel = "← Back to projects",
}: LightHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#EEE] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
        <Link
          href="/"
          className="font-serif text-lg text-[#1a1a1a] outline-none focus-visible:ring-1 focus-visible:ring-[#CCC]"
        >
          {site.firstName}
        </Link>
        <Link
          href={backHref}
          className="text-[14px] text-[#666] transition-colors hover:text-[#1a1a1a]"
        >
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
