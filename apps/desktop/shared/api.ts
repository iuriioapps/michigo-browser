import type { RuntimeInfo } from "@michigo/core/schemas";

/**
 * The IPC contract — the single source of truth shared by all three processes.
 *
 * `preload.ts` declares `const api: DesktopApi`, so if a handler is missing or
 * the wrong shape, it is a compile error rather than a runtime no-op. Channel
 * names live here too, typed once and imported on both sides, because a typo in
 * a raw string would only ever surface at runtime.
 *
 * This file must stay importable from the renderer, so it may only import types
 * from `@michigo/core/schemas` (the pure entry point) — never `@michigo/core`.
 */
export interface DesktopApi {
  readonly app: {
    /** Runtime details plus the domain modules the main process has loaded. */
    info(): Promise<RuntimeInfo>;
  };
}

export const channels = {
  appInfo: "app:info",
} as const;

export type Channel = (typeof channels)[keyof typeof channels];
