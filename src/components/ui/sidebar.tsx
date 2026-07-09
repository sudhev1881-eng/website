"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { useIsMobile } from "@/hooks/use-media-query";
import { zIndex } from "@/lib/tokens";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  logo?: React.ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  className?: string;
}

function SidebarNav({
  items,
  collapsed,
  onNavigate,
}: {
  items: SidebarItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
              aria-current={item.active ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
              {collapsed ? (
                <span className="sr-only">{item.label}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({
  items,
  logo,
  collapsed = false,
  onCollapsedChange,
  mobileOpen = false,
  onMobileOpenChange,
  className,
}: SidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Dialog open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <DialogContent className="left-0 top-0 h-full max-w-[280px] translate-x-0 translate-y-0 rounded-none border-r p-0">
          <DialogHeader className="border-b border-border p-4">
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            {logo}
          </DialogHeader>
          <SidebarNav items={items} onNavigate={() => onMobileOpenChange?.(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 hidden h-[calc(100vh-4rem)] flex-col border-r border-border bg-background transition-all duration-300 md:flex",
        collapsed ? "w-16" : "w-60",
        className,
      )}
      style={{ zIndex: zIndex.sidebar }}
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        {!collapsed ? logo : null}
        {onCollapsedChange ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(collapsed && "mx-auto")}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto" aria-label="Sidebar navigation">
        <SidebarNav items={items} collapsed={collapsed} />
      </nav>
    </aside>
  );
}

export function SidebarInset({
  collapsed,
  className,
  children,
}: {
  collapsed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-300 md:pl-60",
        collapsed && "md:pl-16",
        className,
      )}
    >
      {children}
    </div>
  );
}
