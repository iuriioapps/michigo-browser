import { randomUUID } from "node:crypto";

import { ProjectSchema, type CreateProjectInput, type Project } from "@michigo/core/schemas";

/**
 * The project store, deliberately trivial: an array that dies with the process.
 *
 * It lives in `electron/` rather than a shared package because it carries no
 * domain logic yet — there is nothing here for `vocab` or `anki` to reuse. What
 * is meant to survive the move to real persistence is the IPC contract in
 * `shared/api.ts`, not this file.
 */
const projects: Project[] = [];

export function listProjects(): readonly Project[] {
  return projects;
}

export function createProject(input: CreateProjectInput): Project {
  // Parsed on the way out as well as the way in: the id and timestamp are
  // assigned here, so this is the only place they could be malformed.
  const project = ProjectSchema.parse({
    id: randomUUID(),
    name: input.name,
    createdAt: new Date().toISOString(),
  });

  projects.push(project);

  return project;
}
