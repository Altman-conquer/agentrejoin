---
name: dev
description: >
  Local development guide for the AgentRejoin monorepo. How to build, install,
  test, and run the CLI, server, mobile app, and desktop (Tauri) locally.
  Use when the user types /dev, asks how to "build", "start dev", "install
  locally", or "run the ___ package".
---

# /dev - Local Development

AgentRejoin is a pnpm monorepo. Everything uses pnpm workspaces - do not use `npm` or `yarn` directly.

## First-time setup

```bash
pnpm install                       # installs deps for every package
pnpm --filter happy cli:install    # builds agentrejoin-cli + links it as the global `happy` binary
```

`cli:install` replaces whatever `happy` is on your PATH (npm-installed or not) with a symlink to `packages/agentrejoin-cli/`. Daemon is restarted as part of the script. Uses `~/.agentrejoin/` — same as production.

To undo: `npm unlink -g happy && npm i -g happy@latest`.

## Packages

    packages/agentrejoin-cli     # the `happy` CLI and daemon, published to npm
    packages/agentrejoin-server  # Node + Prisma server, deployed via TeamCity
    packages/agentrejoin-app     # Expo app: iOS, Android, web, Tauri desktop
    packages/agentrejoin-agent   # agent runtime
    packages/agentrejoin-wire    # shared Zod schemas + wire types

## agentrejoin-cli

    packages/agentrejoin-cli
    scripts in package.json:
      typecheck      # tsc --noEmit
      build          # rm -rf dist && tsc --noEmit && pkgroll
      test           # build + vitest run
      cli:install    # build + stop daemon + npm link + start daemon
      prepublishOnly # pnpm test (runs build inside test)
      postinstall    # unpacks difft + rg binaries into tools/unpacked/

Work loop:

```bash
pnpm --filter happy cli:install   # rebuild + relink + restart daemon
happy daemon status               # confirm your build is running
happy doctor                      # list all happy processes
tail -f ~/.agentrejoin/logs/$(ls -t ~/.agentrejoin/logs/ | head -1)
```

Run a single test file quickly:

```bash
pnpm --filter happy exec vitest run src/path/to/file.test.ts
```

Unit-only (fast, ~1 min):

```bash
pnpm --filter happy exec vitest run --project unit
```

Integration tests hit real APIs and are flaky — run on demand, never in the release gate.

### Dev data sandbox (optional)

`happy` reads `AGENTREJOIN_HOME_DIR` to override `~/.agentrejoin/`. To run two versions side-by-side without touching your prod auth:

```bash
AGENTREJOIN_HOME_DIR=~/.agentrejoin-dev happy daemon start
AGENTREJOIN_HOME_DIR=~/.agentrejoin-dev happy auth
```

Point at a local server the same way:

```bash
AGENTREJOIN_SERVER_URL=http://localhost:3005 happy daemon start
```

## agentrejoin-server

```bash
pnpm --filter agentrejoin-server standalone:dev   # localhost:3005, embedded PGlite, no Docker
```

App auto-reloads on source changes. Point the CLI or the Expo app at it with `AGENTREJOIN_SERVER_URL=http://localhost:3005` / `EXPO_PUBLIC_AGENTREJOIN_SERVER_URL=...`.

## agentrejoin-app (Expo)

```bash
pnpm --filter agentrejoin-app start           # expo start (Metro bundler)
pnpm --filter agentrejoin-app ios:dev         # iOS simulator, development variant
pnpm --filter agentrejoin-app android:dev
pnpm --filter agentrejoin-app web             # web build, served locally
pnpm --filter agentrejoin-app tauri:dev       # macOS desktop app
```

Variants:

    development    com.slopus.happy.dev       # hot reload, internal
    preview        com.slopus.happy.preview   # OTA / beta testing
    production     com.ex3ndr.happy           # App Store

### Rebuild and reinstall the desktop .app

When the user asks to "rebuild the desktop app", "kill the running one and reinstall", or anything in that shape — do all four steps in order, do not stop after building.

Variants → product name → build script:

    production    AgentRejoin.app           pnpm --filter agentrejoin-app tauri:build:production
    preview       AgentRejoin (preview).app pnpm --filter agentrejoin-app tauri:build:preview
    dev           AgentRejoin.app     pnpm --filter agentrejoin-app tauri:build:dev

Build output for all variants:

    packages/agentrejoin-app/src-tauri/target/release/bundle/macos/<ProductName>.app

If the variant is ambiguous, check what's running with `ps aux | grep "/Applications/.*AgentRejoin" | grep -v grep` and match. Production is the default.

Steps (substitute `$NAME` with the product name, e.g. `AgentRejoin`):

```bash
# 1. build (slow: ~3–10 min, expo web export then cargo release build)
pnpm --filter agentrejoin-app tauri:build:production

# 2. quit the running app gracefully (no-op if not running)
osascript -e 'tell application "$NAME" to quit' || true

# 3. replace the installed bundle
rm -rf "/Applications/$NAME.app"
cp -R "packages/agentrejoin-app/src-tauri/target/release/bundle/macos/$NAME.app" /Applications/

# 4. relaunch
open -a "$NAME"
```

Notes:
- Run the build in the background (`run_in_background: true` on Bash) and poll the output file. It prints `Finished \`release\` profile` near the end.
- `osascript ... to quit` is graceful — it gives the app a chance to flush state. Only fall back to `pkill -f "/Applications/$NAME.app/Contents/MacOS/app"` if the quit hangs.
- Do NOT skip the `rm -rf` before `cp` — `cp -R` over an existing `.app` merges directories and leaves stale files.
- If macOS Gatekeeper complains on relaunch, `xattr -dr com.apple.quarantine "/Applications/$NAME.app"` clears it. Local builds are unsigned.

## agentrejoin-app-logs (remote log receiver)

```bash
pnpm --filter agentrejoin-app-logs dev       # starts on http://0.0.0.0:8787
```

Receives POST requests to `/logs` from the mobile app's patched console (see `consoleLogging.ts`).
Logs to stdout and `~/.agentrejoin/app-logs/<timestamp>.log`.

To connect: set the log server URL in the app's dev settings to `http://<LAN_IP>:8787`.
The app's `consoleLogging.ts` sends all console.log/warn/error to this endpoint when configured.

Console output must be enabled in the app (dev/preview variants default on, production defaults off,
togglable from the dev settings screen).

## Cross-cutting

- **Hoisted deps:** pnpm hoists node_modules to the repo root. `packages/*/node_modules/` is mostly empty. Node's resolution walks up, so imports work transparently.
- **Workspace deps:** `"agentrejoin-wire": "workspace:*"` resolves to `packages/agentrejoin-wire/` — edits are picked up live.
- **`$npm_execpath`:** legacy; agentrejoin-cli uses `pnpm` literally. Windows cmd.exe doesn't expand `$VAR`.
- **Build before tests:** tests spawn the built CLI binary (for daemon integration), so `pnpm test` runs `build` first. Do not remove.

## Releasing

Do not publish by hand. Use `/release` — it handles npm publish, git tags, GitHub releases, and the smoke check.

## Troubleshooting

    happy: command not found     → pnpm --filter happy cli:install
    daemon won't start           → happy daemon stop; rm ~/.agentrejoin/daemon.state.json.lock; happy daemon start
    wrong `happy` version        → which happy && ls -la $(which happy) — confirms where it resolves to
    tools/unpacked missing       → pnpm install (postinstall re-extracts)
    stale deps after branch swap → pnpm install (pnpm is picky about lockfile drift)

## Rules

- Never use `npm install` or `yarn install` — only pnpm.
- Never add a `dev` / `cli` tsx-based script back to agentrejoin-cli. The build step is not optional — daemon spawns the built binary and would desync.
- Never bring back `release-it`. Releases go through `/release`.
- Never introduce `~/.agentrejoin-dev` as a default. It exists as an opt-in via `AGENTREJOIN_HOME_DIR`, nothing more.
