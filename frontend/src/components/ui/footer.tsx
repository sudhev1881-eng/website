import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string }[];
}

export interface FooterSocialLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface FooterProps {
  logo?: ReactNode;
  description?: string;
  groups?: FooterLinkGroup[];
  social?: FooterSocialLink[];
  copyright?: string;
  className?: string;
}

export function Footer({
  logo,
  description,
  groups = [],
  social = [],
  copyright,
  className,
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("border-t border-border bg-surface", className)}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            {logo}
            {description ? (
              <p className="max-w-xs text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
            {social.length > 0 ? (
              <div className="flex items-center gap-2">
                {social.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {groups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h4 className="text-sm font-bold text-foreground">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-sm text-muted-foreground">
            {copyright ?? `© ${year} StudentLink. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
