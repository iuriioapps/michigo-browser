import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const base =
  "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full " +
  "px-2 text-xs font-medium whitespace-nowrap tabular-nums";

const variants = {
  accent: "bg-primary text-primary-foreground",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-muted-foreground",
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({
  variant = "muted",
  className,
  ...props
}: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return <span className={cn(base, variants[variant], className)} {...props} />;
}
