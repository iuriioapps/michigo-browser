import { Link, type ErrorComponentProps } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { Button, buttonClasses } from "@/components/ui/button";

/** Shown in the content pane when a route throws, so the sidebar stays usable. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <PageHeader
      title="Something went wrong"
      description={error instanceof Error ? error.message : String(error)}
    >
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </PageHeader>
  );
}

export function RouteNotFound() {
  return (
    <PageHeader title="Page not found" description="Nothing lives at this address.">
      <Link to="/" className={buttonClasses({ variant: "outline" })}>
        Back to projects
      </Link>
    </PageHeader>
  );
}
