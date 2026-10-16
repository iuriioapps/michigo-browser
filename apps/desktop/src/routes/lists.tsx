import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/lists")({ component: ListsPage });

function ListsPage() {
  return (
    <PageHeader
      title="Lists"
      description="Word lists that count as already known across every project."
    />
  );
}
