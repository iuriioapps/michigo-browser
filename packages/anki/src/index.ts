import type { ModuleInfo } from "@michigo/core/schemas";

/**
 * Anki integration.
 *
 * Scaffold only — no domain logic yet. The package exists so the workspace
 * boundary, build, lint and test wiring are proven before any is written.
 * Depends on `@michigo/core` for types; `core` never depends back on it.
 */
export const ankiModule: ModuleInfo = {
  name: "@michigo/anki",
  version: "0.1.0",
  status: "scaffold",
};
