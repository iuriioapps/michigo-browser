import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends ComponentProps<"input"> {
  /** Rendered inside the field on the leading edge, e.g. a search glyph. */
  icon?: ReactNode;
  /** Rendered inside the field on the trailing edge, e.g. a ⌘K hint. */
  hint?: ReactNode;
}

/**
 * A field, optionally with decorations tucked inside it.
 *
 * The wrapper carries the border and the focus ring rather than the input, so
 * the icon and hint sit within the outline instead of beside it.
 */
export function Input({ icon, hint, className, ...props }: InputProps) {
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-2.5",
        "focus-within:ring-2 focus-within:ring-ring/40",
        className,
      )}
    >
      {icon === undefined ? null : (
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      )}
      <input
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        {...props}
      />
      {hint === undefined ? null : <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
