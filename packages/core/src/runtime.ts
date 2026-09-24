import process from "node:process";

import { RuntimeInfoSchema, type ModuleInfo, type RuntimeInfo } from "./schemas";

export interface DescribeRuntimeOptions {
  /** Host application name, e.g. `michigo-desktop`. */
  readonly app: string;
  /** Host application version. */
  readonly version: string;
  /** Domain packages the host has loaded. */
  readonly modules: readonly ModuleInfo[];
  /** Electron version, when the host is the desktop app. */
  readonly electron?: string;
}

/**
 * Collects a description of the current process and the modules loaded into it.
 *
 * Shared by the CLI and the Electron main process: both call this, so the two
 * surfaces cannot drift. Composition happens at the app layer — core never
 * imports the domain packages it reports on.
 */
export function describeRuntime(options: DescribeRuntimeOptions): RuntimeInfo {
  return RuntimeInfoSchema.parse({
    app: options.app,
    version: options.version,
    node: process.versions.node,
    platform: `${process.platform}-${process.arch}`,
    electron: options.electron,
    modules: options.modules,
  });
}
