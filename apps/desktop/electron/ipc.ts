import process from "node:process";

import { ankiModule } from "@michigo/anki";
import { describeRuntime } from "@michigo/core";
import { vocabModule } from "@michigo/vocab";
import { app, ipcMain } from "electron";

import { channels } from "../shared/api";

/**
 * Registers every IPC handler the renderer is allowed to reach.
 *
 * Rule for handlers that take arguments: treat anything arriving from the
 * renderer as untrusted and parse it with a zod schema from `@michigo/core`
 * before use, exactly as a server validates an HTTP body. The one channel here
 * takes no arguments, so there is nothing to parse yet.
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
}
