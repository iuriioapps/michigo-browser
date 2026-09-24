import { queryOptions } from "@tanstack/react-query";

/**
 * TanStack Query is usually taught against HTTP, but it does not care where
 * data comes from. Here the "server" is the Electron main process and the
 * transport is IPC.
 */
export const appInfoQuery = queryOptions({
  queryKey: ["app", "info"],
  queryFn: () => window.michigo.app.info(),
});
