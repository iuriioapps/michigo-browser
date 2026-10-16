import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface NavLinkProps {
  to: LinkProps["to"];
  icon: ReactNode;
  label: string;
  /** Rendered as a trailing pill when present, e.g. the card queue depth. */
  count?: number;
  collapsed?: boolean;
}

const base =
  "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors [&_svg]:size-4";

/**
 * A primary nav row.
 *
 * `activeProps` is the router's own mechanism — it compares the link target
 * against the matched route, so the active state cannot drift out of step with
 * what is actually rendered the way a manually tracked `selected` prop could.
 *
 * Collapsed, the label is hidden with `sr-only` rather than dropped, so the
 * link keeps its accessible name and only sighted users lose the text. The
 * `title` gives them a tooltip back.
 */
export function NavLink({ to, icon, label, count, collapsed = false }: NavLinkProps) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={cn(base, collapsed && "justify-center")}
      activeProps={{ className: "bg-sidebar-accent font-medium text-sidebar-accent-foreground" }}
      inactiveProps={{ className: "text-muted-foreground hover:bg-sidebar-accent/50" }}
    >
      {icon}
      <span className={cn("flex-1 truncate", collapsed && "sr-only")}>{label}</span>
      {count === undefined || collapsed ? null : <Badge variant="accent">{count}</Badge>}
    </Link>
  );
}
