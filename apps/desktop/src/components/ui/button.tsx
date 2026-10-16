import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium " +
  "whitespace-nowrap transition-colors outline-none select-none " +
  "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
} as const;

const sizes = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3",
  icon: "size-7 p-0",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export interface ButtonOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The class string on its own.
 *
 * This is what replaces Radix's `asChild`: anything that needs to *look* like a
 * button but be another element — most often a router `<Link>` — takes these
 * classes directly instead of being wrapped in a polymorphic `Slot`.
 */
export function buttonClasses({ variant = "default", size = "md" }: ButtonOptions = {}): string {
  return cn(base, variants[variant], sizes[size]);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & ButtonOptions) {
  return (
    <button type={type} className={cn(buttonClasses({ variant, size }), className)} {...props} />
  );
}
