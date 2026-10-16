import process from "node:process";

import { ankiModule } from "@michigo/anki";
import { describeRuntime } from "@michigo/core";
import { CreateProjectInputSchema } from "@michigo/core/schemas";
import { vocabModule } from "@michigo/vocab";
import { app, ipcMain } from "electron";

import { channels } from "../shared/api";
import { createProject, listProjects } from "./projects";

/**
 * Registers every IPC handler the renderer is allowed to reach.
 *
 * Rule for handlers that take arguments: treat anything arriving from the
 * renderer as untrusted and parse it with a zod schema from `@michigo/core`
 * before use, exactly as a server validates an HTTP body. `project:create`
 * below is the reference implementation — copy it.
 */
export function registerIpc(): void {
  ipcMain.handle(channels.appInfo, () =>
    // The CLI makes this identical call. Both surfaces read from one place.
    describeRuntime({
      app: app.getName(),
      version: app.getVersion(),
      modules: [vocabModule, ankiModule],
      electron: process.versions.electron,
    }),
  );

  ipcMain.handle(channels.projectList, () => listProjects());

  ipcMain.handle(channels.projectCreate, (_event, raw: unknown) => {
    // Never trust the renderer. A parse failure throws, which Electron turns
    // into a rejected promise on the other side — TanStack Query surfaces it
    // as a mutation error, so no extra plumbing is needed.
    const input = CreateProjectInputSchema.parse(raw);

    return createProject(input);
  });
}
