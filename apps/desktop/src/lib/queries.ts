import type { CreateProjectInput } from "@michigo/core/schemas";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * TanStack Query is usually taught against HTTP, but it does not care where
 * data comes from. Here the "server" is the Electron main process and the
 * transport is IPC.
 */
export const appInfoQuery = queryOptions({
  queryKey: ["app", "info"],
  queryFn: () => window.michigo.app.info(),
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: () => window.michigo.projects.list(),
});

/**
 * Creating a project invalidates the list, which is what keeps the grid and the
 * sidebar in step — both read `projectsQuery`, neither owns the data.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => window.michigo.projects.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsQuery.queryKey }),
  });
}
