import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned actions: toggles, primary buttons. */
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6 px-8 pt-4 pb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
        {description === undefined ? null : (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children === undefined ? null : (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </header>
  );
}
