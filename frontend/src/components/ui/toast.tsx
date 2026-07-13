"use client";

import type { ComponentProps } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-card group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-surface group-[.toast]:text-foreground",
          success: "group-[.toast]:border-success/30",
          error: "group-[.toast]:border-error/30",
          warning: "group-[.toast]:border-warning/30",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
