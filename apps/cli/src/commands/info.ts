import { ankiModule } from "@michigo/anki";
import { describeRuntime } from "@michigo/core";
import type { RuntimeInfo } from "@michigo/core/schemas";
import { vocabModule } from "@michigo/vocab";
import { Command } from "@oclif/core";

import { formatRuntimeInfo } from "../format";
import { APP_NAME, VERSION } from "../version";

export default class Info extends Command {
  static override description = "Show runtime details and the domain modules loaded";
  static override enableJsonFlag = true;

  async run(): Promise<RuntimeInfo> {
    await this.parse(Info);

    // Same call the Electron main process makes — if these two ever disagree,
    // the shared package boundary has been broken.
    const info = describeRuntime({
      app: APP_NAME,
      version: VERSION,
      modules: [vocabModule, ankiModule],
    });

    this.log(formatRuntimeInfo(info));
    return info;
  }
}
