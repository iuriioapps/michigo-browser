# Architecture and working guide

## Who this is for

You know TypeScript and web development. You have not necessarily used Electron,
a pnpm monorepo, or a desktop build pipeline. This document explains how this
repository is put together, **why** each piece is the way it is, and how to work
in it day to day.

If you only read one section, read [Electron is three programs](#1-electron-is-three-programs).
Almost everything that looks strange here follows from it.

---

## The five things that will surprise you

1. **Your app is three separate programs**, not one. They cannot call each
   other's functions; they pass messages.
2. **The React UI cannot read files or reach the network on its own.** That is
   deliberate, not a limitation to work around.
3. **Shared packages have no build step.** They export raw `.ts` and each app
   bundles them.
4. **Almost everything is a `devDependency`**, even React. That is correct here.
5. **The linter is not ESLint** and the formatter is not Prettier, because
   TypeScript 7 broke them.

---

## 1. Electron is three programs

When you launch an Electron app, the OS starts several processes. A process has
its own private memory, so one cannot reach into another's. They communicate
only by passing messages.

Three of them matter:

```
┌─────────────────────────────────────────────────────────┐
│ MAIN PROCESS                                 (Node.js)  │
│ Owns windows, files, network, secrets.                  │
│ Full access to the machine.                             │
│ → electron/main.ts, electron/ipc.ts                     │
└───────────────────────────┬─────────────────────────────┘
                            │ IPC messages
┌───────────────────────────┴─────────────────────────────┐
│ PRELOAD                        (small, privileged, CJS) │
│ The only bridge. Exposes a fixed, named API.            │
│ → electron/preload.ts                                   │
└───────────────────────────┬─────────────────────────────┘
                            │ window.michigo
┌───────────────────────────┴─────────────────────────────┐
│ RENDERER                                    (Chromium)  │
│ Your React app. A locked-down browser tab.              │
│ No Node, no fs, no API keys.                            │
│ → src/                                                  │
└─────────────────────────────────────────────────────────┘
```

**The renderer is deliberately powerless.** It is a web page, with exactly the
privileges of a web page. If it ever renders something hostile — an injected
string, a compromised npm package, a malicious link — the blast radius is a
browser tab, not your filesystem.

That creates the central problem of Electron development: the "Add" button lives
in the UI, but only the main process can act on it. So the UI has to _ask_.

A restaurant is the usual analogy. The diner (renderer) cannot walk into the
kitchen. The kitchen (main) has the knives. The waiter (preload) carries orders
and will only accept things on the menu. The diner can order soup; the diner
cannot ask for a knife.

If you have written a web frontend against a backend, you already know this
shape: **the renderer is the frontend, main is the backend, IPC replaces HTTP.**
The difference is that it all runs on one machine, inside one app.

### Two consoles

This trips up everyone once. There are two places logs appear:

| Log from           | Appears in                             |
| ------------------ | -------------------------------------- |
| Renderer (`src/`)  | The window's DevTools (`Cmd+Option+I`) |
| Main (`electron/`) | The terminal where you ran `pnpm dev`  |

If a `console.log` seems to vanish, you are looking at the wrong console.

---

## 2. The IPC contract

Raw IPC is stringly-typed: `ipcRenderer.invoke("notes:add", data)` returns
`Promise<any>`, and if main listens on `"note:add"` instead, nothing fails at
build time — the call just hangs forever at runtime.

`apps/desktop/shared/api.ts` fixes both problems, and is imported by the main
process, the preload script, and the renderer:

```ts
export interface DesktopApi {
  readonly app: {
    info(): Promise<RuntimeInfo>;
  };
}

export const channels = {
  appInfo: "app:info",
} as const;
```

Two things fall out of this:

- **Channel names are written once.** Both sides import `channels`, so a typo is
  impossible rather than merely unlikely.
- **`preload.ts` declares `const api: DesktopApi`.** If you add a method to the
  interface and forget to implement it in preload, that is a compile error.

`shared/api.ts` may only import **types**, and only from
`@michigo/core/schemas` — see [core's two entry points](#core-has-two-entry-points).
It is loaded by the renderer, so a Node built-in in its import graph would break
the browser bundle.

### Tracing one call end to end

When the UI mounts and asks for runtime info:

```
src/lib/queries.ts        queryFn: () => window.michigo.app.info()
        │                 (to React, an ordinary async function)
        ▼
electron/preload.ts       ipcRenderer.invoke("app:info")
        │                 serialises and crosses the process boundary
        ▼
electron/ipc.ts           ipcMain.handle("app:info", …)
        │                 calls describeRuntime() from @michigo/core
        ▼
        └───────────────► return value travels back, the Promise resolves,
                          TanStack Query caches it, React re-renders
```

### Three rules that always apply

1. **Everything crossing IPC is async.** Even if the handler returns instantly,
   the renderer gets a Promise — the message has to travel.
2. **Only plain data crosses.** Think "JSON, plus a bit". Strings, numbers,
   arrays, plain objects and Dates are fine. Functions cannot be sent. Class
   instances arrive as plain objects **with their methods stripped**. This is
   why data shapes here are plain objects defined by zod schemas.
3. **Errors cross too.** If a handler throws, the renderer's Promise rejects and
   TanStack Query surfaces it as `query.error`.

### Why not skip preload?

You _can_ expose `ipcRenderer` directly to the page. Old tutorials do. Don't —
that is handing the diner a knife. Any code in the renderer could then send any
message on any channel. `contextBridge` exposes copies of specific named
functions and nothing else.

The same reasoning is why handlers validate their input with zod even though it
came from "our own" UI. Treat the renderer the way a server treats a browser:
as something that might be sending garbage.

---

## 3. The monorepo

```
apps/
  desktop/   Electron + React + Tailwind + shadcn/ui
  cli/       commander, bundled to one file by tsdown
packages/
  core/      shared primitives and zod schemas
  vocab/     vocabulary coverage analysis   (scaffold)
  anki/      Anki integration               (scaffold)
```

`pnpm-workspace.yaml` declares `apps/*` and `packages/*` as workspaces. Inside
the repo, `"@michigo/core": "workspace:*"` means "link to the local package",
never "download from npm".

### Catalogs

Versions for cross-cutting dependencies live in one place:

```yaml
catalog:
  typescript: ^7.0.2
  "@types/node": ^24.0.0
  vitest: ^5.0.1
  zod: ^4.6.5
```

Packages then write `"typescript": "catalog:"`. Bump it once, every workspace
moves together. Without this, packages drift apart and you get two TypeScript
versions compiling different halves of the repo.

### Internal packages have no build step

`packages/core/package.json` points `exports` straight at source:

```json
"exports": {
  ".": "./src/index.ts",
  "./schemas": "./src/schemas.ts"
}
```

There is no `dist/`, no `tsc -b`, no watch process. Consumers import the
TypeScript and their own bundler (Vite or tsdown) compiles it as part of their
build. This is the simplest monorepo arrangement: edit a shared package and the
app picks it up immediately, with no rebuild step in between.

The trade-off is that only bundlers can consume these packages. That is fine —
the only consumers are two apps we also build.

### Dependency direction is one-way

```
apps/desktop ─┐
apps/cli ─────┴─> packages/vocab, packages/anki ──> packages/core
```

`core` must never import `vocab` or `anki`, and nothing in `packages/` may
import from `apps/`.

Where several domain packages must be combined, **the combining happens in the
app**. That is why `describeRuntime()` takes its modules as an argument rather
than importing them:

```ts
// apps/cli/src/index.ts and apps/desktop/electron/ipc.ts both do this
describeRuntime({ app, version, modules: [vocabModule, ankiModule] });
```

If `core` imported the domain packages to build that list, the arrow would point
both ways and the layering would be fiction.

### `core` has two entry points

This one matters constantly:

| Entry                   | Rule                                 | Imported by                 |
| ----------------------- | ------------------------------------ | --------------------------- |
| `@michigo/core/schemas` | **Pure.** No `node:*` imports, ever. | Renderer, and everyone else |
| `@michigo/core`         | May use Node APIs.                   | Main process and CLI only   |

The renderer needs the _types_ (`RuntimeInfo`, `ModuleInfo`) to render data, but
must never pull `node:fs` into a browser bundle. Splitting pure types and
schemas away from Node-touching code keeps that honest. Adding new code on the
correct side costs nothing; untangling it later is painful.

### Why is React a `devDependency`?

Because Vite and tsdown **bundle `devDependencies` and leave `dependencies`
external**. Two consequences:

- The CLI builds to a single self-contained file with zero install-time deps.
- electron-builder copies only `dependencies` into the packaged app. Keeping it
  empty means the app ships just the bundle — `app.asar` is ~550 KB — and
  sidesteps pnpm's symlinked `node_modules` entirely.

`dependencies` is reserved for things that genuinely _cannot_ be bundled: native
modules, or `electron-updater` when it arrives.

> **This bites you after every `shadcn add`.** The shadcn CLI writes its packages
> into `dependencies`. Move them to `devDependencies` afterwards.

---

## 4. The proof-of-life slice

There are no domain features yet. What exists is one thread pulled through every
layer, deliberately carrying no domain decisions:

- `packages/core` exports `describeRuntime()`, returning the app name and
  version, the Node version, the platform, and the list of loaded modules.
- `packages/vocab` and `packages/anki` each export one `ModuleInfo` constant.
- `apps/cli` prints it: `pnpm cli info`.
- `apps/desktop` renders it, fetched over IPC.

Both surfaces call the same function. **If they ever disagree, the shared
package boundary has been broken.** That is the entire point of the slice: it
proves workspace linking, cross-package imports, the IPC contract, TanStack
Query, Tailwind, shadcn and the test setup all work, without pretending to know
what the app will eventually do.

Delete it once real features exist.

---

## 5. Recipes

### Add an IPC channel

Four files, in this order. The order matters — it is roughly "decide, implement,
expose, consume".

1. **`apps/desktop/shared/api.ts`** — add the method to `DesktopApi` and its
   name to `channels`. This is where you decide what the feature looks like.
2. **`apps/desktop/electron/ipc.ts`** — `ipcMain.handle(...)`. Parse any
   arguments with a zod schema first.
3. **`apps/desktop/electron/preload.ts`** — expose the function. Forget this and
   TypeScript fails the build, because the object no longer matches `DesktopApi`.
4. **`apps/desktop/src/lib/queries.ts`** — add a query (for reads) or mutation
   (for writes), then use it in a component.

For a mutation, invalidate the relevant query afterwards so the UI refetches:

```ts
onSuccess: () => queryClient.invalidateQueries({ queryKey: someQuery.queryKey });
```

### Add real logic to a shared package

Put it in `packages/vocab` or `packages/anki`, export it, and import it from
both apps. Because the real work lives in the package, giving the CLI the same
capability is usually a few lines with no IPC involved — the CLI is already a
Node program with full access.

Flip the package's `status` from `"scaffold"` to `"ready"` when it stops being a
placeholder. A test asserts the constant matches `package.json`, so name and
version cannot silently drift.

### Add a new package

Copy `packages/vocab` — it is deliberately minimal. Set the name, add it to the
consuming apps with `"@michigo/x": "workspace:*"`, and run `pnpm install`. Every
package needs **its own `tsconfig.json`**: the type-aware linter resolves the
nearest one per file, so a package without one is linted with the wrong settings.

---

## 6. The toolchain, and why

| Concern   | Choice                | Why this rather than the obvious thing                   |
| --------- | --------------------- | -------------------------------------------------------- |
| Lint      | **Oxlint**            | `typescript-eslint` refuses to load against TypeScript 7 |
| Format    | **Oxfmt**             | Prettier-compatible, sorts imports and Tailwind classes  |
| Compiler  | **TypeScript 7**      | Native Go port; typechecks all 5 workspaces in ~1s       |
| Bundler   | **Vite 8** (Rolldown) | `vite-plugin-electron` handles the three-process build   |
| Tasks     | **Turborepo**         | Caches and parallelises `build` / `typecheck`            |
| Tests     | **Vitest**            | Vite-native, so one config style for app and tests       |
| CLI build | **tsdown**            | Bundles to a single executable file                      |
| Packaging | **electron-builder**  | Installers for all three OSes, publishes to GitHub       |

The lint choice is worth understanding, because it is the one that looks
eccentric. TypeScript 7 is a native Go rewrite of the compiler; it lacks the
stable programmatic API that `typescript-eslint` depends on, and that plugin
hard-throws on TypeScript major ≥ 7. The alternative is aliasing two TypeScript
versions so ESLint sees 6 while `tsc` is 7. Oxlint's type-aware engine builds
real programs on the Go compiler instead, so there is nothing to work around.

**Type-aware linting is on** (`"typeAware": true`). That is what lets the linter
catch a forgotten `await` — `no-floating-promises` is an error here, and it is
one of the most common real bugs in async code.

### Why Turbo only runs two tasks

`turbo.json` defines `build` and `typecheck` only. Lint, format and test run
once at the repo root, because those tools are already workspace-aware: `oxlint`
walks the whole tree, and Vitest's `projects` option discovers every workspace.
Wrapping them in Turbo would add orchestration for no gain.

`build` declares `"dependsOn": ["^build"]` — "build my dependencies first".

### The strict TypeScript settings

`tsconfig.base.json` is stricter than a default `tsc --init`. The non-obvious ones:

- **`noEmit: true`** everywhere. `tsc` only ever typechecks; bundlers produce
  the JavaScript.
- **`types: []`** forces each package to declare which globals it wants (`node`,
  `vite/client`), so Node APIs cannot leak into renderer code unnoticed.
- **`erasableSyntaxOnly`** bans TypeScript features that need code generation —
  `enum` and constructor parameter properties. Use union types and plain
  assignment. This keeps the code compatible with strip-only transpilers.
- **`verbatimModuleSyntax`** requires `import type` for type-only imports.
- **`noUncheckedIndexedAccess`** makes `arr[0]` be `T | undefined`.

The desktop app splits its config in two — `tsconfig.web.json` (DOM, JSX) and
`tsconfig.node.json` (Node types) — precisely so that importing `node:fs` into
React code is a type error rather than a runtime surprise.

---

## 7. Everyday workflow

```sh
nvm use            # Node 24, from .nvmrc
pnpm install
pnpm dev           # Electron app with hot reload
pnpm cli info      # the CLI, same shared packages
pnpm check         # what CI runs: fmt, lint, typecheck, test
```

`pnpm check` is `fmt:check && lint && typecheck && test`. Run it before pushing;
it is exactly what CI runs, so a green local run means a green CI run.

`pnpm fmt` **applies** formatting; `pnpm fmt:check` only verifies. Note that
Oxfmt formats Markdown too, so editing docs can fail `fmt:check`.

Targeting one workspace uses `--filter`:

```sh
pnpm --filter @michigo/core test
pnpm --filter @michigo/desktop build
```

### Testing

There are three layers, and you should reach for them in this order:

1. **Unit tests in shared packages.** Fast, no DOM. Most of your tests go here —
   which is a reason to keep real logic in `packages/` rather than in the app.
2. **Component tests.** `apps/desktop/src/App.test.tsx` fakes `window.michigo`
   entirely, so the whole UI is testable with **no Electron process running**.
   This is the payoff of the preload design.
3. **End-to-end.** Not set up yet. Playwright can drive a real built Electron app
   via `_electron.launch()`. Worth adding once there are flows worth protecting.

---

## 8. Packaging and release

`pnpm --filter @michigo/desktop package` builds an installer for your current OS
into `apps/desktop/release/`. It produces ~126 MB artifacts — that is Electron
(a whole Chromium), not your code.

Releases are tag-driven:

```sh
# bump version in apps/desktop/package.json and apps/cli/package.json
git tag v0.2.0 && git push --tags
```

The workflow builds on macOS, Windows and Linux in parallel — **Electron apps
must be built on the OS they target** — and uploads to a _draft_ GitHub Release
for review.

> **Builds are unsigned.** macOS will be blocked by Gatekeeper and Windows will
> warn through SmartScreen. Signing macOS needs an Apple Developer account
> ($99/yr); the environment variables are stubbed in `.github/workflows/release.yml`.
> Auto-update effectively requires signing, so it is deferred too.

---

## 9. Gotchas

- **Node is pinned to 24, and so is `@types/node`** — even though npm's latest is 26. Electron 44 bundles Node 24.21, and the shared packages execute inside
  Electron's main process. Typing them against a newer Node would let code
  compile that crashes once packaged. Bump these when Electron bumps its bundled
  Node, not before.
- **Corepack was removed in Node 26.** On Node 24 use
  `corepack enable && corepack prepare pnpm@12.6.0 --activate`; on 26 you need
  `npm i -g pnpm@12`.
- **pnpm blocks install scripts by default.** A new dependency that needs one
  fails the install with an explicit message; add it to `allowBuilds` in
  `pnpm-workspace.yaml`. Currently `electron`, `esbuild` and
  `electron-winstaller`.
- **pnpm will not resolve packages published in the last 24 hours** — a
  supply-chain guard. It records deliberate exceptions under
  `minimumReleaseAgeExclude`.
- **Preload must be CommonJS.** Sandboxed preload scripts cannot be ESM, which is
  why `vite.config.ts` forces `preload.cjs` output while everything else is ESM.
- **`base: "./"` in `vite.config.ts` is load-bearing.** Production loads over
  `file://`, so absolute asset paths would 404.
- **shadcn components in `src/components/ui/` are generated** and excluded from
  lint and format. Treat them as yours to edit, but expect `shadcn add` to
  rewrite them.

---

## Appendix: where things live

```
apps/desktop/
  electron/main.ts        creates the window, wires app lifecycle
  electron/ipc.ts         ipcMain handlers  ← add backend logic here
  electron/preload.ts     contextBridge     ← expose new methods here
  shared/api.ts           the IPC contract  ← start here for a new feature
  src/App.tsx             the UI
  src/lib/queries.ts      TanStack Query definitions
  src/components/ui/      generated by shadcn
  vite.config.ts          three-process build
  vitest.config.ts        separate, so tests don't launch Electron
  electron-builder.yml    installer config

apps/cli/
  src/index.ts            commander program
  tsdown.config.ts        single-file bundle config

packages/core/
  src/schemas.ts          pure zod schemas  ← renderer-safe
  src/runtime.ts          Node-using code

Root:
  pnpm-workspace.yaml     workspaces, catalog, allowBuilds
  tsconfig.base.json      shared compiler settings
  turbo.json              build + typecheck orchestration
  .oxlintrc.json          lint rules
  vitest.config.ts        discovers all workspace test projects
  CLAUDE.md               the same rules, condensed, for AI assistants
```
