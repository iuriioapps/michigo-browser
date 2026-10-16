# Michigo Browser: working notes

Rules that the code cannot state for itself. Read before adding a feature.

## Package dependency direction

Strictly one way:

```
apps/desktop ─┐
apps/cli ─────┴─> packages/vocab, packages/anki ──> packages/core
```

`core` must never import `vocab` or `anki`, and nothing in `packages/` may import from `apps/`. Where several domain packages have to be combined, the composition happens in the app. See how `describeRuntime` receives its modules as an argument instead of importing them.

## `@michigo/core` has two entry points

- `@michigo/core/schemas` is **pure**. No `node:*` imports, ever. The Electron renderer imports from here, so a Node built-in would break the browser bundle.
- `@michigo/core` (the `.` entry) may use Node APIs. Only the main process and the CLI import it.

Keeping new code on the correct side of this split is much cheaper than untangling it later.

## Everything in the apps goes in `devDependencies`

Vite and tsdown bundle `devDependencies` and leave `dependencies` external. Consequences:

- The CLI ships as one self-contained file with no install-time dependencies.
- electron-builder copies only `dependencies` into the packaged app, so an empty `dependencies` keeps the app small and avoids pnpm symlink problems.

`dependencies` is reserved for things that genuinely cannot be bundled: native modules, or `electron-updater` when it lands.

## Validate at the IPC boundary

Treat everything arriving from the renderer as untrusted, exactly as a server treats an HTTP body. Parse it with a zod schema from `@michigo/core` inside the handler before use. The renderer is a locked-down browser tab; a compromised page or dependency must not be able to drive the main process.

`project:create` in `apps/desktop/electron/ipc.ts` is the reference implementation: it parses with `CreateProjectInputSchema` before touching the argument. Copy it. A parse failure throws, Electron rejects the renderer's promise, and TanStack Query surfaces it as a mutation error; no extra plumbing.

`app:info` takes no arguments, so it has nothing to parse.

Register handlers through the local `handle()` in `registerIpc`, never `ipcMain.handle` directly. `handle()` rejects calls from any frame other than the app's own page.

## Adding an IPC channel

Touch these four places, in order:

1. `apps/desktop/shared/api.ts`: add the method to `DesktopApi` and its name to `channels`. This is where you decide what the feature looks like.
2. `apps/desktop/electron/ipc.ts`: `handle()`, parsing any input.
3. `apps/desktop/electron/preload.ts`: expose the function. Forgetting this is a compile error, because the object is typed as `DesktopApi`.
4. `apps/desktop/src/lib/queries.ts`: a query or mutation, then use it.

Never expose `ipcRenderer` itself to the page, only named functions.

## Adding a CLI command

The CLI uses oclif with the `explicit` command strategy, because the bundled CLI is one file and has no `commands/` directory to glob.

1. Write the command class as the default export of `apps/cli/src/commands/<name>.ts`.
2. Register it in `COMMANDS` in `apps/cli/src/index.ts`. The key is the command ID.

Two rules keep this working:

- The entry must not use top-level `await`. oclif imports the entry to read `COMMANDS`, and an await there deadlocks that self-import.
- Do not add an `oclif` block to `package.json`. The config is inline in `src/index.ts`, so the same `target` works under tsx and in `dist/`.

## Routing

TanStack Router, file-based, with three constraints the code cannot explain:

- **Hash history, not browser history.** Production loads the renderer from a `file://` URL, where pushState paths do not resolve. Set in `src/router.tsx`.
- **`src/routeTree.gen.ts` is generated but committed.** The plugin only runs under `vite dev` / `vite build`, and CI runs `turbo run typecheck` on its own. It is excluded from lint and format instead of from git.
- **`autoCodeSplitting` stays off.** Splitting emits dynamic `import()`s, and Chromium treats `file://` as an opaque origin, so they fail once packaged.

A `-` prefix keeps a path out of the route tree: `src/routes/-components/` is where components used by exactly one route live. Test files are excluded via `routeFileIgnorePattern`, or `settings.test.tsx` would become `/settings/test`.

## UI components

Hand-written, no shadcn, no `cva`, no Radix. A variant is a plain lookup object:

```ts
const variants = { default: "…", outline: "…" } as const;
```

Two rules follow from `cn()` being a plain join with no `tailwind-merge`:

- A variant map never repeats a utility the base string already sets.
- `className` from a caller is for **layout only** (margin, width, grid placement), never to override a variant's padding or color.

There is no `asChild`. A component that others need to borrow the look of exports its class string too, as `button.tsx` exports `buttonClasses()`; a router `<Link>` takes that directly.

## Node version pinning

`.nvmrc` and `@types/node` are both pinned to 24 because Electron 44 bundles Node 24.21.0. The shared packages execute inside Electron main, so typing them against a newer Node would let code compile that crashes in the packaged app. Bump these when Electron bumps its bundled Node, not before.

## Toolchain notes

- Lint/format is **Oxlint + Oxfmt**, not ESLint/Prettier: `typescript-eslint` refuses to load against TypeScript 7, whereas `oxlint-tsgolint` builds real TS programs on the Go compiler.
- `erasableSyntaxOnly` is on, which bans `enum` and constructor parameter properties. Use union types and plain assignment.
- `apps/desktop/src/components/ui/` is hand-written and linted like everything else. The only excluded file is the generated `src/routeTree.gen.ts`.
- New dependencies with install scripts must be added to `allowBuilds` in `pnpm-workspace.yaml`, otherwise pnpm fails the install and tells you so.

## Writing Markdown

Oxfmt runs with `proseWrap: "never"`, so it joins every paragraph onto one line. Do not hard-wrap by hand; the editor soft-wraps.

- Use headings for anything a reader may want to link to or find in the outline. A finding, a step or a topic gets a heading, not a bold label.
- Do not start bullets or paragraphs with a bold label (`- **Thing.** text`). If items need labels, use headings or a table.
- Use bold at most once per section, for the one thing a skimming reader must not miss. No bold for emphasis in the middle of a sentence.
- No `---` horizontal rules between sections. Headings are the separators.
- A bullet is one or two lines. If it needs more, make it a paragraph under a heading.
- Every fenced code block has a language tag. Use `text` for diagrams and trees.
- Do not number headings (`## 1. Foo`). Numbers break anchors when sections move.
- No em-dashes. Use a colon, parentheses or a new sentence.
- Before you finish a doc, read only its headings. The outline alone must tell the reader what is where.
