import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionLabelProps {
  children: ReactNode;
  /** Trailing action, e.g. the "+" that adds to the section. */
  action?: ReactNode;
  collapsed?: boolean;
}

export function SectionLabel({ children, action, collapsed = false }: SectionLabelProps) {
  return (
    <div
      className={cn(
        "flex h-7 items-center gap-2 px-2.5",
        collapsed ? "justify-center" : "justify-between",
      )}
    >
      <span
        className={cn(
          "text-[0.6875rem] font-medium tracking-wider text-muted-foreground uppercase",
          collapsed && "sr-only",
        )}
      >
        {children}
      </span>
      {action}
    </div>
  );
}
