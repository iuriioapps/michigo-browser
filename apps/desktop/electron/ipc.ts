import process from "node:process";

import { ankiModule } from "@michigo/anki";
import { describeRuntime } from "@michigo/core";
import { CreateProjectInputSchema } from "@michigo/core/schemas";
import { vocabModule } from "@michigo/vocab";
import { type IpcMainInvokeEvent, app, ipcMain } from "electron";

import { channels } from "../shared/api";
import { createProject, listProjects } from "./projects";

/**
 * Registers every IPC handler the renderer is allowed to reach.
 *
 * Rule for handlers that take arguments: treat anything arriving from the
 * renderer as untrusted and parse it with a zod schema from `@michigo/core`
 * before use, exactly as a server validates an HTTP body. `project:create`
 * below is the reference implementation — copy it.
 *
 * Every handler goes through `handle`, which rejects calls from any frame
 * other than the app's own page at `rendererUrl`.
 */
export function registerIpc(rendererUrl: string): void {
  // Normalized, so a dev server URL without a trailing slash still matches.
  const trustedUrl = new URL(rendererUrl).href;

  function isTrustedSender(event: IpcMainInvokeEvent): boolean {
    const url = URL.parse(event.senderFrame?.url ?? "");

    if (url === null) {
      return false;
    }
    // Hash routing changes only the fragment; the page itself must match.
    url.hash = "";

    return url.href === trustedUrl;
  }

  function handle(channel: string, listener: (raw: unknown) => unknown): void {
    ipcMain.handle(channel, (event, raw: unknown) => {
      if (!isTrustedSender(event)) {
        throw new Error(`IPC call to ${channel} from untrusted frame`);
      }

      return listener(raw);
    });
  }

  handle(channels.appInfo, () =>
    // The CLI makes this identical call. Both surfaces read from one place.
    describeRuntime({
      app: app.getName(),
      version: app.getVersion(),
      modules: [vocabModule, ankiModule],
      electron: process.versions.electron,
    }),
  );

  handle(channels.projectList, () => listProjects());

  handle(channels.projectCreate, (raw) => {
    // Never trust the renderer. A parse failure throws, which Electron turns
    // into a rejected promise on the other side — TanStack Query surfaces it
    // as a mutation error, so no extra plumbing is needed.
    const input = CreateProjectInputSchema.parse(raw);

    return createProject(input);
  });
}
