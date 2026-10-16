import { createHashHistory, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  // Hash history, not browser history: production loads the renderer from a
  // file:// URL, where pushState paths do not resolve to anything.
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
