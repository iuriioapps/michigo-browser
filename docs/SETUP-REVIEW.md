# Initial setup review

Independent review of the `initial-implementation` branch (working tree as of 2026-10-03), checked against current practice for Electron apps, pnpm/Turborepo monorepos, and TypeScript/React tooling.

## Verdict

The foundation is sound. **Fix the two High findings before you build features on it.**

The package boundaries, the IPC contract, the toolchain and the tests are better than most production starters. The gaps are in Electron hardening and in CI/release plumbing, which is normal at this stage. None of them needs a restructure.

`pnpm check` and `pnpm build` both pass locally: format, lint, typecheck, and 12 test files with 42 tests.

## What is already right

| Area | What the setup does |
| --- | --- |
| Electron process model | `contextIsolation`, `sandbox` and `nodeIntegration: false` are set. The preload exposes only named functions, never `ipcRenderer`, and is emitted as CJS, as sandboxed preloads require. |
| Typed IPC contract | `shared/api.ts` keeps one interface and one channel map. The preload object is typed as `DesktopApi`, so a missing handler fails to compile. |
| Trust boundary | `project:create` parses its input with zod in main. The output is also parsed. |
| Package layering | `core` ← `vocab`/`anki` ← apps, with composition in the apps. The pure `@michigo/core/schemas` entry point keeps Node built-ins out of the renderer. |
| Packaging model | Everything in `devDependencies` gets bundled, so the CLI ships as a single file and the packaged app needs no `node_modules`. `npmRebuild: false` follows from that. |
| TypeScript strictness | `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly` and `isolatedModules` are on. Workspace packages export source, so the dev loop has no build step. |
| Version hygiene | A pnpm `catalog:` holds the shared versions. `@types/node` is pinned to the Node that Electron bundles, with the reason written down. `allowBuilds` uses the install-script allowlist. |
| Routing for `file://` | Hash history is used and code splitting is off. The reasons for both are documented. |
| Tests | Vitest projects are configured. The UI tests replace `window.michigo` with a stateful stub, so no Electron process is needed. Drift tests keep the hand-written version constants in step with `package.json`. |
| Lint | Oxlint runs type-aware, with `no-floating-promises` and `no-misused-promises` as errors and jsx-a11y enabled. |
| CI | It cancels superseded runs, installs from the frozen lockfile, reads Node from `.nvmrc`, and runs each check as its own step. |
| Native over dependencies | The dialog uses `<dialog>`, `cn()` is hand-written, and `localStorage` access is guarded. The project rules are recorded in CLAUDE.md and ARCHITECTURE.md. |

## Findings

Severity reflects risk once real features land, not risk today.

### High

#### H1. Turbo typecheck cache goes stale across packages

`turbo.json` declares `"typecheck": {}` with no `dependsOn`. Turbo therefore leaves `packages/core` out of the dependents' task hashes.

I verified this. I appended a line to `packages/core/src/schemas.ts` and ran `turbo run typecheck --dry=json`. Only `@michigo/core#typecheck` got a new hash. `desktop`, `cli`, `vocab` and `anki` kept their cached hashes, so a schema change that breaks the desktop app would still report a cached pass.

CI is not affected today because it starts with a cold cache. Local `pnpm check` is affected now, and CI will be once remote caching is on.

Fix: add the dependency edge.

```json
"typecheck": { "dependsOn": ["^typecheck"] }
```

#### H2. No Content-Security-Policy

`apps/desktop/index.html` has no CSP, and neither does any session header. CSP is item 7 on Electron's security checklist. The sandbox limits the damage, but a CSP is what stops injected script from running at all. This matters more once the app renders imported text, which a vocabulary tool will.

Fix: add a meta tag. In dev, Vite's HMR needs `ws:` and inline styles. Either loosen the policy in dev only, or set it from main through `session.webRequest.onHeadersReceived`.

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'"
/>
```

### Medium

#### M1. Navigation and new windows are not locked down

Checklist items 13 and 14. `main.ts` sets neither `will-navigate` nor `setWindowOpenHandler`. Once user content contains a link, a click can take over the app window or open an unsandboxed one.

Fix: deny both. Send external `https:` links to `shell.openExternal` through an allowlist.

#### M2. IPC sender is not validated

Checklist item 17. The handlers trust every frame. With only one window, this is cheap insurance now and expensive to add later.

Fix: check `event.senderFrame?.url` against the dev server URL or the `file://` app path, in one wrapper that all `ipcMain.handle` calls go through.

#### M3. Electron fuses not set

Checklist item 19. The packaged binary still honors `RunAsNode`, `NODE_OPTIONS` and `--inspect`, and does not enforce ASAR integrity.

Fix: add an `electronFuses` block to `electron-builder.yml`:

```yaml
electronFuses:
  runAsNode: false
  enableNodeOptionsEnvironmentVariable: false
  enableNodeCliInspectArguments: false
  enableEmbeddedAsarIntegrityValidation: true
  onlyLoadAppFromAsar: true
```

#### M4. A release can ship without passing checks

`release.yml` runs on any `v*` tag and never runs format, lint, typecheck or test. Nothing ties the tag to the version in `package.json` either. electron-builder uses `package.json`, so tag `v0.2.0` on a 0.1.0 tree publishes 0.1.0.

Fix: run `pnpm check` as the first step. Fail when `${GITHUB_REF_NAME#v}` differs from the desktop package version.

#### M5. Workflow token permissions are not restricted

`ci.yml` has no `permissions:` block, so it gets the repository default, which may be read/write. Release already scopes its permissions correctly.

Fix: add `permissions: { contents: read }` at the top level of `ci.yml`.

#### M6. Permission requests are auto-granted

Checklist item 5. There is no `session.setPermissionRequestHandler`, and Electron's default is to approve every request: camera, microphone, notifications, geolocation and so on.

Fix: call `setPermissionRequestHandler` and `setPermissionCheckHandler` in `main.ts`. Deny everything until a feature needs a specific permission.

#### M7. DevTools ship in production

`main.ts` never sets an application menu, so Electron installs its default one. That menu includes View → Toggle Developer Tools and Reload in the packaged app.

Fix: build a menu with `Menu.buildFromTemplate`, and include the DevTools and Reload entries only when `!app.isPackaged`. On macOS, keep the Edit role menu, or copy and paste stop working. Optionally set `devTools: !app.isPackaged` in `webPreferences`.

#### M8. CI never packages the app

CI runs `vite build` but never runs electron-builder. A broken `files` glob, a missing preload, or an ASAR or fuse problem only appears when someone pushes a release tag.

Fix: add this step on Linux. It is fast, and it catches packaging regressions on every pull request.

```sh
pnpm --filter @michigo/desktop exec electron-builder --dir --publish never
```

### Low

Fix these as you touch the surrounding code.

| ID | Finding | Fix |
| --- | --- | --- |
| L1 | Actions are pinned by tag, not SHA. OpenSSF recommends SHA pins for third-party actions such as `pnpm/action-setup`. | Pin by SHA. Dependabot already updates actions, and it updates SHA pins too. |
| L2 | Dependabot has no `electron` group. Electron majors change the bundled Node, and `.nvmrc` and `@types/node` must move with it. | Put `electron` in its own group, or ignore its majors, so the bump is a deliberate decision. |
| L3 | TanStack Query retries a failed query three times with backoff. Here a rejection means a deterministic handler error, so retries only delay the error by about 7 s. | Set `retry: false` (or 1) on the app's `QueryClient`. |
| L4 | A raw `ZodError` reaches the user. A name over 200 characters makes `new-project-dialog.tsx` show `Error invoking remote method 'project:create': ZodError: [...]`. | Add `maxLength={200}` to the input. Later, map validation errors to readable text in one place. |
| L5 | No router error or not-found component, so a throwing route shows TanStack Router's default error screen. | Set `defaultErrorComponent` and `defaultNotFoundComponent` in `router.tsx`. |
| L6 | No app icon (there is no `build/` directory) and no single-instance lock. A second launch opens a second process with its own in-memory state, which becomes a data-integrity issue once there is persistence. | Add an icon and call `app.requestSingleInstanceLock()`. |
| L7 | Release builds are unsigned. `release.yml` already documents this. | Fix before any public distribution. macOS notarization also needs `hardenedRuntime` and an entitlements file. |
| L8 | No coverage measurement. The main process has no tests, and nothing shows that. | Add `@vitest/coverage-v8` and report coverage in CI. Leave thresholds off until there is real domain code. |
| L9 | `pnpm-workspace.yaml` exempts exactly `vite@8.3.1` from `minimumReleaseAgeExclude`. After the next Vite bump, the entry does nothing. | Add a comment that says why it exists, or remove it once 8.3.1 has passed the release-age window. |
| L10 | Geist has no Japanese or Chinese glyphs, so CJK text depends on each OS's fallback font. | Add a fallback stack such as `"Hiragino Sans", "Yu Gothic UI", "Noto Sans CJK JP"` after Geist in `index.css`. |
| L11 | No `.editorconfig`, no `.vscode/extensions.json` that recommends the Oxc extension, and no pre-commit hook. Without the extension, editors fall back to ESLint or Prettier and fight the formatter. | Add them as conveniences. CI already catches formatting and lint problems. |

### Out of scope

These are deliberate omissions, not findings: the in-memory project store, the auto-updater, crash reporting and logging, and E2E (Playwright-Electron) tests. Add each one with the feature that needs it.

## Suggested order

1. H1: a one-line `turbo.json` change.
2. M5 and M4 (CI permissions, release gate): YAML only.
3. H2, M1, M2, M6 and M7 together: one hardening pass over `main.ts`, `ipc.ts` and `index.html`.
4. M3 and M8: fuses in `electron-builder.yml`, plus the CI packaging step that proves they work.
5. The Low findings, as you touch the surrounding code.
