#!/usr/bin/env node
import { ankiModule } from "@michigo/anki";
import { describeRuntime } from "@michigo/core";
import { vocabModule } from "@michigo/vocab";
import { Command } from "commander";

import { formatRuntimeInfo } from "./format";
import { APP_NAME, VERSION } from "./version";

const program = new Command(APP_NAME).description("Michigo companion CLI").version(VERSION);

program
  .command("info")
  .description("Show runtime details and the domain modules loaded")
  .option("--json", "print raw JSON instead of a table")
  .action((options: { json?: boolean }) => {
    // Same call the Electron main process makes — if these two ever disagree,
    // the shared package boundary has been broken.
    const info = describeRuntime({
      app: APP_NAME,
      version: VERSION,
      modules: [vocabModule, ankiModule],
    });

    console.log(options.json === true ? JSON.stringify(info, null, 2) : formatRuntimeInfo(info));
  });

await program.parseAsync();
