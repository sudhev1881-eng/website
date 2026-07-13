"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSafeMotion } from "@/lib/motion";

type TabsContextValue = {
  value?: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs components must be used within Tabs");
  }
  return ctx;
}

const Tabs = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const current = value ?? uncontrolled;

  return (
    <TabsContext.Provider
      value={{
        value: current,
        setValue: (next) => {
          if (value === undefined) setUncontrolled(next);
          onValueChange?.(next);
        },
      }}
    >
      <TabsPrimitive.Root
        ref={ref}
        value={current}
        onValueChange={(next) => {
          if (value === undefined) setUncontrolled(next);
          onValueChange?.(next);
        }}
        {...props}
      />
    </TabsContext.Provider>
  );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-11 items-center gap-1 rounded-xl bg-surface p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const { value: activeValue } = useTabsContext();
  const { reduced } = useSafeMotion();
  const isActive = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative inline-flex h-9 min-h-9 min-w-11 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {isActive ? (
        reduced ? (
          <span
            className="absolute inset-0 z-0 rounded-lg bg-background shadow-sm"
            aria-hidden
          />
        ) : (
          <motion.span
            layoutId="tabs-active-indicator"
            className="absolute inset-0 z-0 rounded-lg bg-background shadow-sm"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            aria-hidden
          />
        )
      ) : null}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
