# Architecture and working guide

## Who this is for

You know TypeScript and web development. You have not necessarily used Electron, a pnpm monorepo, or a desktop build pipeline. This document explains how this repository is put together, why each piece is the way it is, and how to work in it day to day.

If you only read one section, read [Electron is three programs](#electron-is-three-programs). Almost everything that looks strange here follows from it.

## The five things that will surprise you

1. Your app is three separate programs, not one. They cannot call each other's functions; they pass messages.
2. The React UI cannot read files or reach the network on its own. That is deliberate, not a limitation to work around.
3. Shared packages have no build step. They export raw `.ts` and each app bundles them.
4. Almost everything is a `devDependency`, even React. That is correct here.
5. The linter is not ESLint and the formatter is not Prettier, because TypeScript 7 broke them.

## Electron is three programs

When you launch an Electron app, the OS starts several processes. A process has its own private memory, so one cannot reach into another's. They communicate only by passing messages.

Three of them matter:

```text
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

The renderer is deliberately powerless. It is a web page, with exactly the privileges of a web page. Suppose it renders something hostile: an injected string, a compromised npm package, or a malicious link. The damage stays inside a browser tab and never reaches your filesystem.

That creates the central problem of Electron development. The "Add" button lives in the UI, but only the main process can act on it. So the UI has to _ask_.

A restaurant is the usual analogy. The diner (renderer) cannot walk into the kitchen. The kitchen (main) has the knives. The waiter (preload) carries orders and will only accept things on the menu. The diner can order soup; the diner cannot ask for a knife.

If you have written a web frontend against a backend, you already know this shape. **The renderer is the frontend, main is the backend, and IPC replaces HTTP.** The difference is that it all runs on one machine, inside one app.

### Two consoles

This trips up everyone once. Logs appear in two places:

| Log from           | Appears in                             |
| ------------------ | -------------------------------------- |
| Renderer (`src/`)  | The window's DevTools (`Cmd+Option+I`) |
| Main (`electron/`) | The terminal where you ran `pnpm dev`  |

If a `console.log` seems to vanish, you are looking at the wrong console.

## The IPC contract

Raw IPC is stringly-typed. `ipcRenderer.invoke("notes:add", data)` returns `Promise<any>`. If main listens on `"note:add"` instead, nothing fails at build time; the call just hangs forever at runtime.

`apps/desktop/shared/api.ts` fixes both problems. The main process, the preload script and the renderer all import it:

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

You get two guarantees from this file. First, channel names are written once: both sides import `channels`, so a typo is impossible rather than merely unlikely. Second, `preload.ts` declares `const api: DesktopApi`, so a method you add to the interface but forget to implement in preload is a compile error.

`shared/api.ts` may only import types, and only from `@michigo/core/schemas` (see [core has two entry points](#core-has-two-entry-points)). The renderer loads it, so a Node built-in in its import graph would break the browser bundle.

### Tracing one call end to end

When the UI mounts and asks for runtime info:

```text
src/lib/queries.ts        queryFn: () => window.michigo.app.info()
        │                 (to React, an ordinary async function)
        ▼
electron/preload.ts       ipcRenderer.invoke("app:info")
        │                 serializes and crosses the process boundary
        ▼
electron/ipc.ts           ipcMain.handle("app:info", …)
        │                 calls describeRuntime() from @michigo/core
        ▼
        └───────────────► return value travels back, the Promise resolves,
                          TanStack Query caches it, React re-renders
```

### Three rules that always apply

#### Everything crossing IPC is async

Even if the handler returns instantly, the renderer gets a Promise, because the message has to travel.

#### Only plain data crosses

Think "JSON, plus a bit". Strings, numbers, arrays, plain objects and Dates are fine. Functions cannot be sent. Class instances arrive as plain objects with their methods stripped. That is why data shapes here are plain objects defined by zod schemas.

#### Errors cross too

If a handler throws, the renderer's Promise rejects and TanStack Query surfaces it as `query.error`.

### Why not skip preload?

You _can_ expose `ipcRenderer` directly to the page. Old tutorials do. Don't: that hands the diner a knife. Any code in the renderer could then send any message on any channel. `contextBridge` exposes copies of specific named functions and nothing else.

For the same reason, handlers validate their input with zod even though it came from "our own" UI. Treat the renderer the way a server treats a browser: as something that might be sending garbage.

## The monorepo

```text
apps/
  desktop/   Electron + React + Tailwind + TanStack Router/Query
  cli/       oclif, bundled to one file by tsdown
packages/
  core/      shared primitives and zod schemas
  vocab/     vocabulary coverage analysis   (scaffold)
  anki/      Anki integration               (scaffold)
```

`pnpm-workspace.yaml` declares `apps/*` and `packages/*` as workspaces. Inside the repo, `"@michigo/core": "workspace:*"` means "link to the local package", never "download from npm".

### Catalogs

Versions for cross-cutting dependencies live in one place:

```yaml
catalog:
  typescript: ^7.0.2
  "@types/node": ^24.0.0
  vitest: ^5.0.1
  zod: ^4.6.5
```

Packages then write `"typescript": "catalog:"`. Bump the version once, and every workspace moves together. Without a catalog, packages drift apart and you get two TypeScript versions compiling different halves of the repo.

### Internal packages have no build step

`packages/core/package.json` points `exports` straight at source:

```json
"exports": {
  ".": "./src/index.ts",
  "./schemas": "./src/schemas.ts"
}
```

There is no `dist/`, no `tsc -b`, no watch process. Consumers import the TypeScript, and their own bundler (Vite or tsdown) compiles it as part of their build. This is the simplest monorepo arrangement: edit a shared package and the app picks it up immediately.

The cost is that only bundlers can consume these packages. That is fine, because the only consumers are two apps we also build.

### Dependency direction is one-way

```text
apps/desktop ─┐
apps/cli ─────┴─> packages/vocab, packages/anki ──> packages/core
```

`core` must never import `vocab` or `anki`, and nothing in `packages/` may import from `apps/`.

Where several domain packages must be combined, the combining happens in the app. That is why `describeRuntime()` takes its modules as an argument rather than importing them:

```ts
// apps/cli/src/index.ts and apps/desktop/electron/ipc.ts both do this
describeRuntime({ app, version, modules: [vocabModule, ankiModule] });
```

If `core` imported the domain packages to build that list, the arrow would point both ways and the layering would be fiction.

### `core` has two entry points

This rule matters constantly:

| Entry                   | Rule                             | Imported by                 |
| ----------------------- | -------------------------------- | --------------------------- |
| `@michigo/core/schemas` | Pure. No `node:*` imports, ever. | Renderer, and everyone else |
| `@michigo/core`         | May use Node APIs.               | Main process and CLI only   |

The renderer needs the _types_ (`RuntimeInfo`, `ModuleInfo`) to render data, but must never pull `node:fs` into a browser bundle. Splitting pure types and schemas away from Node-touching code keeps that honest. Adding new code on the correct side costs nothing; untangling it later is painful.

### Why is React a `devDependency`?

Vite and tsdown bundle `devDependencies` and leave `dependencies` external. That has two consequences. The CLI builds to a single self-contained file with zero install-time dependencies. And electron-builder copies only `dependencies` into the packaged app, so an empty `dependencies` means the app ships just the bundle (`app.asar` is about 550 KB) and avoids pnpm's symlinked `node_modules` entirely.

`dependencies` is reserved for things that genuinely _cannot_ be bundled: native modules, or `electron-updater` when it arrives.

## The proof-of-life slice

There are no domain features yet. What exists is one thread pulled through every layer, deliberately carrying no domain decisions:

- `packages/core` exports `describeRuntime()`, which returns the app name and version, the Node version, the platform, and the list of loaded modules.
- `packages/vocab` and `packages/anki` each export one `ModuleInfo` constant.
- `apps/cli` prints it: `pnpm cli info`.
- `apps/desktop` renders it on `/settings`, fetched over IPC.

Both surfaces call the same function. **If they ever disagree, someone has broken the shared package boundary.** The slice proves that workspace linking, cross-package imports, the IPC contract, TanStack Query, Tailwind and the test setup all work, without pretending to know what the app will eventually do.

Delete it once real features exist.

### The second slice: projects

`project:list` and `project:create` are the first channels that carry arguments, so they are where the validation rule stops being hypothetical. `ipc.ts` parses with `CreateProjectInputSchema` before touching the payload.

The store behind them (`electron/projects.ts`) is an array that dies with the process. That is deliberate. The IPC contract is the part meant to survive the arrival of real persistence, and it is easier to get that shape right without a database in the way. The projects grid and the sidebar both read one `projectsQuery`, so neither owns the data and creating a project updates both.

## Recipes

### Add an IPC channel

Change four files, in this order: decide, implement, expose, consume.

1. `apps/desktop/shared/api.ts`: add the method to `DesktopApi` and its name to `channels`. This is where you decide what the feature looks like.
2. `apps/desktop/electron/ipc.ts`: add `ipcMain.handle(...)`. Parse any arguments with a zod schema first.
3. `apps/desktop/electron/preload.ts`: expose the function. If you forget, TypeScript fails the build, because the object no longer matches `DesktopApi`.
4. `apps/desktop/src/lib/queries.ts`: add a query (for reads) or a mutation (for writes), then use it in a component.

For a mutation, invalidate the relevant query afterwards so the UI refetches:

```ts
onSuccess: () => queryClient.invalidateQueries({ queryKey: someQuery.queryKey });
```

### Add real logic to a shared package

Put it in `packages/vocab` or `packages/anki`, export it, and import it from both apps. The CLI is already a Node program with full access, so giving it the same capability is usually a few lines with no IPC.

Change the package's `status` from `"scaffold"` to `"ready"` when it stops being a placeholder. A test asserts that the constant matches `package.json`, so name and version cannot silently drift.

### Add a new package

Copy `packages/vocab`, which is deliberately minimal. Set the name, add it to the consuming apps with `"@michigo/x": "workspace:*"`, and run `pnpm install`.

Every package needs its own `tsconfig.json`. The type-aware linter resolves the nearest one per file, so a package without one is linted with the wrong settings.

## The toolchain, and why

| Concern   | Choice            | Why this rather than the obvious thing                   |
| --------- | ----------------- | -------------------------------------------------------- |
| Lint      | Oxlint            | `typescript-eslint` refuses to load against TypeScript 7 |
| Format    | Oxfmt             | Prettier-compatible, sorts imports and Tailwind classes  |
| Compiler  | TypeScript 7      | Native Go port; typechecks all 5 workspaces in ~1s       |
| Bundler   | Vite 8 (Rolldown) | `vite-plugin-electron` handles the three-process build   |
| Tasks     | Turborepo         | Caches and parallelizes `build` / `typecheck`            |
| Tests     | Vitest            | Vite-native, so one config style for app and tests       |
| CLI build | tsdown            | Bundles to a single executable file                      |
| Packaging | electron-builder  | Installers for all three OSes, publishes to GitHub       |

### Why Oxlint

The lint choice is the one that looks eccentric. TypeScript 7 is a native Go rewrite of the compiler. It lacks the stable programmatic API that `typescript-eslint` depends on, and that plugin hard-throws on TypeScript major 7 and above. The alternative is to alias two TypeScript versions, so ESLint sees 6 while `tsc` is 7. Oxlint's type-aware engine builds real programs on the Go compiler instead, so there is nothing to work around.

Type-aware linting is on (`"typeAware": true`). It lets the linter catch a forgotten `await`. `no-floating-promises` is an error here, because a floating promise is one of the most common real bugs in async code.

### Why Turbo only runs two tasks

`turbo.json` defines `build` and `typecheck` only. Lint, format and test run once at the repo root, because those tools are already workspace-aware: `oxlint` walks the whole tree, and Vitest's `projects` option discovers every workspace. Wrapping them in Turbo would add orchestration for no gain.

`build` declares `"dependsOn": ["^build"]`, which means "build my dependencies first".

### The strict TypeScript settings

`tsconfig.base.json` is stricter than a default `tsc --init`. The non-obvious settings:

| Setting | Effect |
| --- | --- |
| `noEmit: true` | Set everywhere. `tsc` only typechecks; bundlers produce the JavaScript. |
| `types: []` | Each package declares which globals it wants (`node`, `vite/client`), so Node APIs cannot leak into renderer code unnoticed. |
| `erasableSyntaxOnly` | Bans TypeScript features that need code generation: `enum` and constructor parameter properties. Use union types and plain assignment instead. This keeps the code compatible with strip-only transpilers. |
| `verbatimModuleSyntax` | Requires `import type` for type-only imports. |
| `noUncheckedIndexedAccess` | Makes `arr[0]` be `T \| undefined`. |

The desktop app splits its config in two: `tsconfig.web.json` (DOM, JSX) and `tsconfig.node.json` (Node types). With that split, importing `node:fs` into React code is a type error rather than a runtime surprise.

## Everyday workflow

```sh
nvm use            # Node 24, from .nvmrc
pnpm install
pnpm dev           # Electron app with hot reload
pnpm cli info      # the CLI, same shared packages
pnpm check         # what CI runs: fmt, lint, typecheck, test
```

`pnpm check` runs `fmt:check && lint && typecheck && test`, exactly what CI runs. Run it before you push; a green local run means a green CI run.

`pnpm fmt` applies formatting; `pnpm fmt:check` only verifies. Oxfmt formats Markdown too, so editing docs can fail `fmt:check`.

To target one workspace, use `--filter`:

```sh
pnpm --filter @michigo/core test
pnpm --filter @michigo/desktop build
```

### Testing

There are three layers. Reach for them in this order.

#### Unit tests in shared packages

Fast, with no DOM. Most of your tests go here, which is one more reason to keep real logic in `packages/` rather than in the app.

#### Component tests

The route and component tests in `apps/desktop/src/` replace `window.michigo` with a stub (see `src/test/render.tsx`). The whole UI is testable with no Electron process running. This is the payoff of the preload design.

#### End-to-end tests

Not set up yet. Playwright can drive a real built Electron app via `_electron.launch()`. Add it once there are flows worth protecting.

## Packaging and release

`pnpm --filter @michigo/desktop package` builds an installer for your current OS into `apps/desktop/release/`. The artifacts are about 126 MB. Almost all of that is Electron (a whole Chromium), not your code.

Releases are tag-driven:

```sh
# bump version in apps/desktop/package.json and apps/cli/package.json
git tag v0.2.0 && git push --tags
```

The workflow builds on macOS, Windows and Linux in parallel, because Electron apps must be built on the OS they target. It uploads the results to a _draft_ GitHub Release for review.

> [!WARNING] Builds are unsigned. Gatekeeper blocks them on macOS, and SmartScreen warns on Windows. Signing for macOS needs an Apple Developer account ($99/yr); the environment variables are stubbed in `.github/workflows/release.yml`. Auto-update effectively requires signing, so it is deferred too.

## Gotchas

### Node and `@types/node` are pinned to 24

npm's latest is 26, but Electron 44 bundles Node 24.21, and the shared packages execute inside Electron's main process. Typing them against a newer Node would let code compile that crashes once packaged. Bump these when Electron bumps its bundled Node, not before.

### Corepack was removed in Node 26

On Node 24, use `corepack enable && corepack prepare pnpm@12.6.0 --activate`. On 26, you need `npm i -g pnpm@12`.

### pnpm blocks install scripts by default

A new dependency that needs one fails the install with an explicit message. Add it to `allowBuilds` in `pnpm-workspace.yaml`. The list currently holds `electron`, `esbuild` and `electron-winstaller`.

### pnpm ignores packages published in the last 24 hours

This is a supply-chain guard. Deliberate exceptions go under `minimumReleaseAgeExclude`.

### Preload must be CommonJS

Sandboxed preload scripts cannot be ESM. That is why `vite.config.ts` forces `preload.cjs` output while everything else is ESM.

### `base: "./"` in `vite.config.ts` is load-bearing

Production loads over `file://`, so absolute asset paths would 404.

### `src/routeTree.gen.ts` is generated but committed

The generator only runs under `vite dev` and `vite build`, while CI typechecks on its own. The file is excluded from lint and format rather than from git.

### Router code splitting stays off

Dynamic `import()` fails from a `file://` origin. The failure only shows up in the packaged app, never in dev.

### Hash history, not browser history

Same `file://` reason: pushState paths do not resolve there.

## Appendix: where things live

```text
apps/desktop/
  electron/main.ts        creates the window, wires app lifecycle
  electron/ipc.ts         ipcMain handlers  ← add backend logic here
  electron/preload.ts     contextBridge     ← expose new methods here
  shared/api.ts           the IPC contract  ← start here for a new feature
  src/routes/             file-based routes; `-` prefixed dirs are not routes
  src/router.tsx          router instance + hash history
  src/lib/queries.ts      TanStack Query definitions
  src/components/ui/      hand-written primitives
  src/components/sidebar/ the nav rail
  vite.config.ts          three-process build
  vitest.config.ts        separate, so tests don't launch Electron
  electron-builder.yml    installer config

apps/cli/
  src/index.ts            oclif entry, COMMANDS registry
  src/commands/           one file per command
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
