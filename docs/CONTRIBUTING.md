# Contributing to AgentRejoin

AgentRejoin is built for people who use coding agents every day and want to resume them from anywhere. Contributions that improve that workflow are welcome.

If you don't get a response on your PR or issue, tag **@bra1ndump**.

## Contribution Priorities

We review contributions in this order:

1. **Bug fixes** — crashes, broken flows, data loss
2. **UI touchups** — polish, layout fixes, visual consistency
3. **New features** — new capabilities that serve the core use case
4. **Refactors** — code quality improvements, test coverage
5. **Core refactors** — sync engine, RPC layer, server changes (discuss first)

If your contribution is lower on this list, it may take longer to get reviewed. That's not a reflection of its value — it's just how we triage.

## Issues

We currently can't reply to every issue individually. We review them in bulk using AI-assisted triage. They're useful — keep filing them — but PRs with clear fixes will always get priority.

Every issue should start with a **one-paragraph summary** of the problem. Don't bury the lede in reproduction steps or logs. Lead with what's broken and what you expected.

## Pull Requests

### The Rules

1. **Start with a one-paragraph summary.** What was broken or missing? What does this PR do about it? A human skimming 20 PRs needs to understand yours in 10 seconds.

2. **Show proof it works.** Include a video, screenshots, or actual log output demonstrating the fix in a real running app. The "before" state can be described with words. The "after" must be shown visually. Unit tests passing is not enough — show it working end-to-end.

3. **Address Codex review comments before requesting human review.** We use automated Codex reviews on all PRs. Resolve those first — they catch the obvious stuff so human reviewers can focus on the important stuff.

4. **Keep PRs focused.** One fix per PR. One feature per PR. If you touched something unrelated, split it out.

5. **Core changes need a discussion first.** If your PR touches the sync engine, RPC protocol, encryption, or server — open an issue or Discord thread before writing code. These areas affect every user and need design alignment.

### What Makes a Good PR

- **Show proof it works.** Screenshots, screen recordings, or actual log output demonstrating the fix in a real running app. Unit tests passing is not enough — show it working end-to-end.
- Links to the issue it fixes (if one exists)
- Short, clear title (`fix: voice session stuck in connecting state` not `Update voice.ts`)
- No unrelated changes, no drive-by refactors

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Git

### Getting Started

```bash
git clone https://github.com/Altman-conquer/agentrejoin.git
cd agentrejoin
pnpm install
```

### AgentRejoin App (Mobile + Web)

```bash
pnpm --filter agentrejoin-app start          # Expo dev server
pnpm --filter agentrejoin-app ios:dev        # iOS simulator
pnpm --filter agentrejoin-app android:dev    # Android emulator
pnpm web                                # Browser (shortcut)
pnpm --filter agentrejoin-app typecheck      # Run after all changes
```

The app has three build variants — all can be installed simultaneously on the same device:

| Variant | Bundle ID | App Name | Use Case |
|---------|-----------|----------|----------|
| Development | `com.zhandj.agentrejoin.dev` | AgentRejoin | Local development with hot reload |
| Preview | `com.zhandj.agentrejoin.preview` | AgentRejoin (preview) | Beta testing |
| Production | `com.zhandj.agentrejoin` | AgentRejoin | App Store release |

Swap `ios:dev` for `ios:preview` or `ios:production` (same for `android:`).

#### macOS Desktop (Tauri)

```bash
pnpm --filter agentrejoin-app tauri:dev      # Run with hot reload
pnpm --filter agentrejoin-app tauri:build:dev
```

### AgentRejoin CLI

```bash
pnpm --filter agentrejoin build
pnpm --filter agentrejoin test
pnpm --filter agentrejoin cli:install   # Build + link this workspace as the global `agentrejoin` + restart daemon
```

`cli:install` replaces the `agentrejoin` binary installed from npm with a symlink to this workspace.
It reuses `~/.agentrejoin/` (auth, sessions) — no separate dev home. To undo:

```bash
npm unlink -g agentrejoin && npm i -g agentrejoin@latest
```

To sandbox dev data, set `AGENTREJOIN_HOME_DIR=~/.agentrejoin-dev` in your shell before running `agentrejoin`.

### AgentRejoin Server

```bash
pnpm --filter agentrejoin-server standalone:dev   # Local server (no Docker needed)
```

Runs on `localhost:3005` with embedded PGlite. To point the app at your local server:

```bash
EXPO_PUBLIC_AGENTREJOIN_SERVER_URL=http://localhost:3005 pnpm --filter agentrejoin-app start
```

## Project Structure

This is a monorepo with four packages:

- **agentrejoin-app** — React Native + Expo mobile/web client
- **agentrejoin-cli** — Node.js CLI that wraps Claude Code and Codex
- **agentrejoin-agent** — Remote agent control
- **agentrejoin-server** — Backend for encrypted sync

For architecture details, check the [docs/](.) folder or ask AgentRejoin itself - it knows how the project is set up.

## Community

- [Discord](https://discord.gg/fX9WBAhyfD) — best place for questions and discussion
- [Website](https://agentrejoin.zhandj.com)
