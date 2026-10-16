import type { Project } from "@michigo/core/schemas";
import { Link } from "@tanstack/react-router";

/**
 * Deliberately plain. The mock's card — progress bar, coverage stats, subtitle
 * counts — is a separate effort; this one exists so the grid has something real
 * to render and the create flow has something visible to change.
 *
 * The whole card is the link, so the hit target matches what looks clickable.
 */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="surface flex flex-col gap-1 p-4 transition-shadow hover:ring-ring/40"
    >
      <h3 className="font-heading text-base font-medium">{project.name}</h3>
      <p className="font-mono text-xs text-muted-foreground">
        {new Date(project.createdAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
