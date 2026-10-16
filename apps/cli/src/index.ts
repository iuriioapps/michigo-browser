#!/usr/bin/env node
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { execute } from "@oclif/core";

import Info from "./commands/info";
import { APP_NAME, VERSION } from "./version";

/** Read by oclif's "explicit" discovery, which imports this very file. */
export const COMMANDS = { info: Info };

const self = fileURLToPath(import.meta.url);

// No top-level `await`: oclif imports this module to read COMMANDS, and
// awaiting here would deadlock that self-import. `execute` handles its own errors.
// The config is inline rather than in package.json so `target` points at
// whichever file is running: src/index.ts under tsx, dist/index.js once bundled.
void execute({
  loadOptions: {
    root: dirname(self),
    isRoot: true,
    pjson: {
      name: APP_NAME,
      version: VERSION,
      type: "module",
      oclif: {
        bin: APP_NAME,
        commands: { strategy: "explicit", target: self, identifier: "COMMANDS" },
      },
    },
  },
});
