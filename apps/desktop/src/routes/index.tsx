import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { useNewProject } from "@/components/new-project-dialog";
import { PageHeader } from "@/components/page-header";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { projectsQuery } from "@/lib/queries";

import { ProjectCard } from "./-components/project-card";

export const Route = createFileRoute("/")({ component: ProjectsPage });

const sortOptions = [
  { value: "group", label: "By group" },
  { value: "easiest", label: "Easiest first" },
] as const;

function ProjectsPage() {
  const projects = useQuery(projectsQuery);
  const openNewProject = useNewProject();
  // Nothing reads this yet — the card design and its ordering are a separate
  // effort. It is here so the control is wired rather than decorative.
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("group");

  return (
    <>
      <PageHeader
        title="Projects"
        description="A project is a set of texts you want to understand — a show, a book, a blog."
      >
        <SegmentedControl
          label="Sort projects"
          value={sort}
          onChange={setSort}
          options={sortOptions}
        />
        <Button onClick={openNewProject}>
          <Plus />
          New project
        </Button>
      </PageHeader>

      <div className="px-8 pb-8">
        {projects.isError ? (
          <p className="text-sm text-destructive">{projects.error.message}</p>
        ) : null}

        {projects.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
            {projects.data?.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
