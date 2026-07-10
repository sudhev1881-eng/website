"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Menu, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/navbar";
import { useIsMobile } from "@/hooks/use-media-query";
import { fadeTransition } from "@/lib/motion";
import { zIndex } from "@/lib/tokens";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardShellProps {
  brand: React.ReactNode;
  navItems: DashboardNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  user?: { name: string; role?: string };
  homeHref?: string;
  children: React.ReactNode;
}

function SidebarNavButtons({
  items,
  activeId,
  onNavigate,
  collapsed,
  onItemClick,
}: {
  items: DashboardNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  collapsed?: boolean;
  onItemClick?: () => void;
}) {
  return (
    <ul className="space-y-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => {
                onNavigate(item.id);
                onItemClick?.();
              }}
              className={cn(
                "flex w-full min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
              {collapsed ? <span className="sr-only">{item.label}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardShell({
  brand,
  navItems,
  activeId,
  onNavigate,
  user,
  homeHref = "/",
  children,
}: DashboardShellProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const activeItem = navItems.find((item) => item.id === activeId);

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 border-b border-border bg-background/80 backdrop-blur-md"
        style={{ zIndex: zIndex.navbar }}
      >
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : null}
            <Link href={homeHref} className="shrink-0">
              {brand}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden items-center gap-3 sm:flex">
                <Avatar name={user.name} size="sm" />
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  {user.role ? (
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            <ThemeToggle />
            <Button variant="ghost" size="sm" href={homeHref} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {!isMobile ? (
          <aside
            className={cn(
              "fixed left-0 top-16 hidden h-[calc(100vh-4rem)] flex-col border-r border-border bg-background transition-all duration-300 md:flex",
              collapsed ? "w-16" : "w-60",
            )}
            style={{ zIndex: zIndex.sidebar }}
          >
            <nav className="flex-1 overflow-y-auto" aria-label="Dashboard navigation">
              <SidebarNavButtons
                items={navItems}
                activeId={activeId}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            </nav>
            <div className="border-t border-border p-3">
              <Button
                variant="ghost"
                size="sm"
                className={cn("w-full", collapsed && "px-0")}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? "→" : "← Collapse"}
              </Button>
            </div>
          </aside>
        ) : null}

        {isMobile ? (
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogContent className="left-0 top-0 h-full max-w-[280px] translate-x-0 translate-y-0 rounded-none border-r p-0">
              <DialogHeader className="border-b border-border p-4">
                <DialogTitle className="sr-only">Navigation</DialogTitle>
                {brand}
              </DialogHeader>
              <SidebarNavButtons
                items={navItems}
                activeId={activeId}
                onNavigate={onNavigate}
                onItemClick={() => setMobileOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : null}

        <main
          className={cn(
            "min-h-[calc(100vh-4rem)] flex-1 transition-all duration-300",
            !isMobile && (collapsed ? "md:pl-16" : "md:pl-60"),
          )}
        >
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {activeItem ? (
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:sr-only">
                {activeItem.label}
              </p>
            ) : null}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={fadeTransition}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}