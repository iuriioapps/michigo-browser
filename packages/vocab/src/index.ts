import type { ModuleInfo } from "@michigo/core/schemas";

/**
 * Vocabulary coverage analysis.
 *
 * Scaffold only — no domain logic yet. The package exists so the workspace
 * boundary, build, lint and test wiring are proven before any is written.
 * Depends on `@michigo/core` for types; `core` never depends back on it.
 */
export const vocabModule: ModuleInfo = {
  name: "@michigo/vocab",
  version: "0.1.0",
  status: "scaffold",
};
