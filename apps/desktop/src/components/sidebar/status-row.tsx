import { cn } from "@/lib/utils";

export interface StatusRowProps {
  label: string;
  /** Drives the dot colour: connected things are green, everything else muted. */
  ok?: boolean;
  collapsed?: boolean;
}

export function StatusRow({ label, ok = true, collapsed = false }: StatusRowProps) {
  return (
    <div
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground",
        collapsed && "justify-center",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          ok ? "bg-success" : "bg-muted-foreground/40",
        )}
      />
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </div>
  );
}
