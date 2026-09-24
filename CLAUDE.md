# Michigo Browser — working notes

Rules that the code cannot state for itself. Read before adding a feature.

## Package dependency direction

Strictly one way:

```
apps/desktop ─┐
apps/cli ─────┴─> packages/vocab, packages/anki ──> packages/core
```

`core` must never import `vocab` or `anki`, and nothing in `packages/` may
import from `apps/`. Where several domain packages have to be combined, the
composition happens in the app — see how `describeRuntime` receives its modules
as an argument instead of importing them.

## `@michigo/core` has two entry points

- `@michigo/core/schemas` is **pure**. No `node:*` imports, ever. The Electron
  renderer imports from here, so a Node built-in would break the browser bundle.
- `@michigo/core` (the `.` entry) may use Node APIs. Only the main process and
  the CLI import it.

Keeping new code on the correct side of this split is much cheaper than
untangling it later.

## Everything in the apps goes in `devDependencies`

Vite and tsdown bundle `devDependencies` and leave `dependencies` external.
Consequences:

- The CLI ships as one self-contained file with no install-time dependencies.
- electron-builder copies only `dependencies` into the packaged app, so an empty
  `dependencies` keeps the app small and avoids pnpm symlink problems.

`dependencies` is reserved for things that genuinely cannot be bundled — native
modules, or `electron-updater` when it lands. **The shadcn CLI writes its
packages into `dependencies`; move them after running it.**

## Validate at the IPC boundary

Treat everything arriving from the renderer as untrusted, exactly as a server
treats an HTTP body. Parse it with a zod schema from `@michigo/core` inside the
`ipcMain.handle` callback before use. The renderer is a locked-down browser tab;
a compromised page or dependency must not be able to drive the main process.

The current `app:info` channel takes no arguments, so it has nothing to parse —
the first channel that does should establish the pattern.

## Adding an IPC channel

Touch these four places, in order:

1. `apps/desktop/shared/api.ts` — add the method to `DesktopApi` and its name to
   `channels`. This is where you decide what the feature looks like.
2. `apps/desktop/electron/ipc.ts` — `ipcMain.handle`, parsing any input.
3. `apps/desktop/electron/preload.ts` — expose the function. Forgetting this is
   a compile error, because the object is typed as `DesktopApi`.
4. `apps/desktop/src/lib/queries.ts` — a query or mutation, then use it.

Never expose `ipcRenderer` itself to the page — only named functions.

## Node version pinning

`.nvmrc` and `@types/node` are both pinned to 24 because Electron 44 bundles
Node 24.21.0. The shared packages execute inside Electron main, so typing them
against a newer Node would let code compile that crashes in the packaged app.
Bump these when Electron bumps its bundled Node, not before.

## Toolchain notes

- Lint/format is **Oxlint + Oxfmt**, not ESLint/Prettier: `typescript-eslint`
  refuses to load against TypeScript 7, whereas `oxlint-tsgolint` builds real TS
  programs on the Go compiler.
- `erasableSyntaxOnly` is on, which bans `enum` and constructor parameter
  properties. Use union types and plain assignment.
- shadcn components in `apps/desktop/src/components/ui/` are generated; they are
  excluded from lint and format.
- New dependencies with install scripts must be added to `allowBuilds` in
  `pnpm-workspace.yaml`, otherwise pnpm fails the install and tells you so.
