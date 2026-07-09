import Link from "next/link";
import { cn } from "@/lib/utils";

interface StudentLinkLogoProps {
  className?: string;
  showText?: boolean;
}

export function StudentLinkLogo({
  className,
  showText = true,
}: StudentLinkLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm">
        SL
      </div>
      {showText ? (
        <span className="text-lg font-bold tracking-tight text-foreground">
          StudentLink
        </span>
      ) : null}
    </div>
  );
}

export function StudentLinkLogoLink({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      <StudentLinkLogo />
    </Link>
  );
}
