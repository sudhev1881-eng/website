"use client";

import * as React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface font-semibold text-foreground",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-base",
        xl: "h-20 w-20 text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  name?: string;
  status?: "online" | "offline" | "busy";
}

const statusColors = {
  online: "bg-success",
  offline: "bg-muted",
  busy: "bg-error",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, name = "", status, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const showImage = src && !imageError;

    return (
      <div
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        {showImage ? (
          <Image
            src={src}
            alt={alt ?? name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span aria-hidden="true">{getInitials(name || alt || "?")}</span>
        )}
        {status ? (
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
              statusColors[status],
            )}
            aria-label={`Status: ${status}`}
          />
        ) : null}
      </div>
    );
  },
);
Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };
