import type { Project, RuntimeInfo } from "@michigo/core/schemas";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { render } from "@testing-library/react";

import type { DesktopApi } from "../../shared/api";
import { routeTree } from "../routeTree.gen";

export const runtimeInfo: RuntimeInfo = {
  app: "Michigo",
  version: "0.1.0",
  node: "24.21.0",
  platform: "darwin-x64",
  electron: "44.4.5",
  modules: [
    { name: "@michigo/vocab", version: "0.1.0", status: "scaffold" },
    { name: "@michigo/anki", version: "0.1.0", status: "scaffold" },
  ],
};

/**
 * A stand-in for the main process.
 *
 * The projects namespace is backed by a real array rather than a fixed
 * resolved value, so `create` genuinely affects the next `list` — which is the
 * only way the create-then-refetch flow can be tested honestly.
 */
export function createApiStub(
  overrides: Partial<DesktopApi> = {},
  seed: readonly string[] = [],
): DesktopApi {
  const projects: Project[] = [];

  const add = (name: string): Project => {
    const project: Project = {
      id: `project-${String(projects.length)}`,
      name,
      createdAt: "2026-09-25T00:00:00.000Z",
    };

    projects.push(project);

    return project;
  };

  seed.forEach(add);

  return {
    app: { info: () => Promise.resolve(runtimeInfo) },
    projects: {
      list: () => Promise.resolve([...projects]),
      create: (input) => Promise.resolve(add(input.name)),
    },
    ...overrides,
  };
}

/**
 * The preload design pays off here: the renderer only ever talks to
 * `window.michigo`, so the whole UI is testable by faking that object. No
 * Electron process is started.
 *
 * Memory history, where the app uses hash history — tests need no URL.
 */
export function renderRoute(path: string, api: DesktopApi = createApiStub()) {
  window.michigo = api;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
