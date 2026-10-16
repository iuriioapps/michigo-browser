import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";
import { projectsQuery } from "@/lib/queries";

export const Route = createFileRoute("/projects/$projectId")({ component: ProjectPage });

function ProjectPage() {
  const { projectId } = Route.useParams();
  const projects = useQuery(projectsQuery);
  // Derived from the list rather than fetched on its own. A dedicated
  // `project:get` channel is worth adding once the detail view needs fields the
  // list rows do not carry — right now there are none.
  const project = projects.data?.find((candidate) => candidate.id === projectId);

  if (projects.isPending) {
    return <PageHeader title="Loading…" />;
  }

  if (project === undefined) {
    return (
      <>
        <PageHeader
          title="Project not found"
          description="It may have been removed, or lost when the app last quit."
        >
          <Link to="/" className={buttonClasses({ variant: "outline" })}>
            <ArrowLeft />
            All projects
          </Link>
        </PageHeader>
      </>
    );
  }

  return (
    <>
      <PageHeader title={project.name} description="Nothing analysed yet.">
        <Link to="/" className={buttonClasses({ variant: "outline" })}>
          <ArrowLeft />
          All projects
        </Link>
      </PageHeader>

      <div className="px-8 pb-8">
        <section className="surface flex max-w-2xl flex-col gap-2 p-4">
          <h2 className="font-heading text-base font-medium">Details</h2>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">created</span>
            <span className="font-mono">{new Date(project.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">id</span>
            <span className="font-mono text-xs">{project.id}</span>
          </div>
        </section>
      </div>
    </>
  );
}
