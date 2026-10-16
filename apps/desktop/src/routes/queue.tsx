import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/queue")({ component: QueuePage });

function QueuePage() {
  return <PageHeader title="Card queue" description="Cards staged for export to Anki." />;
}
