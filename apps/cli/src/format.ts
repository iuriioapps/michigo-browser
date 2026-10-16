import type { RuntimeInfo } from "@michigo/core/schemas";

const LABEL_WIDTH = 10;
const NAME_WIDTH = 18;
const VERSION_WIDTH = 10;

/** Renders runtime info as the human-readable table `michigo info` prints. */
export function formatRuntimeInfo(info: RuntimeInfo): string {
  const lines = [
    `${info.app} ${info.version}`,
    "",
    `${"node".padEnd(LABEL_WIDTH)}${info.node}`,
    `${"platform".padEnd(LABEL_WIDTH)}${info.platform}`,
  ];

  if (info.electron !== undefined) {
    lines.push(`${"electron".padEnd(LABEL_WIDTH)}${info.electron}`);
  }

  lines.push("", `modules (${info.modules.length})`);

  for (const module of info.modules) {
    lines.push(
      `  ${module.name.padEnd(NAME_WIDTH)}${module.version.padEnd(VERSION_WIDTH)}${module.status}`,
    );
  }

  return lines.join("\n");
}
