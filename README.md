# Michigo Browser

未知語: Know what you don't know

A desktop application for Japanese language learning, with a companion CLI.

> **Status: scaffold.** The repository currently contains no domain features. What exists is the full production toolchain — build, lint, typecheck, test, package and release — plus one end-to-end "proof of life" slice that exercises every seam. See [Proof of life](#proof-of-life).

New to Electron, pnpm workspaces, or this toolchain? Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — it explains how the pieces fit together and why, for someone who knows TypeScript and the web but not this stack.

## Prerequisites

- **Node 24** — `nvm use` picks it up from `.nvmrc`. Pinned to match the Node that Electron bundles (24.21.0), so dev, CI and tests run the same runtime as the packaged app.
- **pnpm 12** — `corepack enable && corepack prepare pnpm@12.6.0 --activate`. Corepack ships with Node 24; it was removed in Node 26, where you need `npm i -g pnpm@12` instead.

```sh
nvm use
corepack enable
pnpm install
```

## Everyday commands

| Command                                  | What it does                                    |
| ---------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                               | Runs the Electron app with hot reload           |
| `pnpm cli info`                          | Runs the CLI against the same shared packages   |
| `pnpm check`                             | Format, lint, typecheck and test — what CI runs |
| `pnpm build`                             | Builds every workspace                          |
| `pnpm --filter @michigo/desktop package` | Builds an installer for your OS into `release/` |

Run `pnpm fmt` to apply formatting; `pnpm check` only verifies it.

## Layout

```
apps/
  desktop/   Electron + React + Tailwind + shadcn/ui
  cli/       oclif, bundled to a single file by tsdown
packages/
  core/      shared primitives and zod schemas
  vocab/     vocabulary coverage analysis  (scaffold)
  anki/      Anki integration              (scaffold)
```

Dependencies run one way only: `vocab` and `anki` depend on `core`, apps depend on all three, and `core` never depends back. See `CLAUDE.md` for the full rules.

## Proof of life

`describeRuntime()` in `@michigo/core` reports the current process and the modules loaded into it. Both surfaces call it:

```sh
pnpm cli info    # prints the table in a terminal
pnpm dev         # renders the same data in the app, fetched over IPC
```

If those two ever disagree, the shared-package boundary has been broken. This slice deliberately carries no domain logic — it exists to prove the wiring.

## Releasing

Bump the version in `apps/desktop/package.json` and `apps/cli/package.json`, commit, then:

```sh
git tag v0.2.0 && git push --tags
```

The release workflow builds installers on macOS, Windows and Linux and uploads them to a **draft** GitHub Release for you to review before publishing.

> **Builds are currently unsigned.** macOS will be blocked by Gatekeeper and Windows will warn via SmartScreen. Signing needs an Apple Developer account ($99/yr) for macOS; the env vars are stubbed in `.github/workflows/release.yml`. Auto-update effectively requires signing, so it is deferred too.

## Licence

MIT — see [LICENSE](LICENSE).
