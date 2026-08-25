<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/.github/logotype-light.png">
    <source media="(prefers-color-scheme: light)" srcset="/.github/logotype-dark.png">
    <img src="/.github/logotype-dark.png" width="440" alt="AgentRejoin">
  </picture>

  <h1>Rejoin your coding-agent sessions from anywhere</h1>

  <p>
    Find existing Claude Code and Codex conversations on your servers,<br>
    resume them from web or mobile, and keep working without starting over.
  </p>

  <p>
    <a href="https://agentrejoin.zhandj.com/app"><strong>Open Web App</strong></a>
    · <a href="https://agentrejoin.zhandj.com">Website</a>
    · <a href="README.zh-CN.md">简体中文</a>
  </p>
</div>

<img width="1600" height="900" alt="AgentRejoin running on desktop and mobile" src="/.github/header.png" />

## What AgentRejoin does

- **Find existing sessions** - browse coding-agent conversations already stored on connected servers.
- **Resume in context** - reopen a Claude Code session or Codex thread with its original working directory and history.
- **Continue from any device** - read progress, reply, approve tools, and switch between web, mobile, and terminal.
- **Stay informed** - receive notifications when an agent needs permission or finishes a task.
- **Keep conversations private** - messages are end-to-end encrypted before they reach the relay.
- **Self-host when needed** - run the relay and web app on your own infrastructure.

## Quick start

The product name is AgentRejoin. The published CLI commands remain `happy` and
`happy-agent` for compatibility while the package and protocol migration is
deferred.

```bash
npm install -g happy
happy auth login
happy daemon start
```

Run an agent through the connected CLI:

```bash
happy claude
happy codex
```

Resume a known AgentRejoin session from the terminal:

```bash
happy resume <session-id>
```

For the remote control CLI:

```bash
happy-agent auth login
happy-agent machines
happy-agent list
happy-agent resume <session-id>
```

## How it works

The server daemon indexes supported coding-agent sessions on that machine. The
web or mobile client requests a resume through the encrypted relay; the daemon
then reattaches the underlying Claude Code session or Codex thread and streams
new messages back to the client. The relay handles encrypted synchronization
but cannot read conversation content.

## Repository

- `packages/happy-app` - Expo web and mobile client, plus the Tauri desktop shell
- `packages/happy-cli` - coding-agent runtime and machine daemon
- `packages/happy-agent` - remote session control CLI
- `packages/happy-server` - encrypted synchronization relay
- `packages/happy-server-self-host` - self-hosted relay and bundled web app

## Development

```bash
pnpm install
pnpm --filter happy-app web
```

Run focused checks before submitting changes:

```bash
pnpm --filter happy-app typecheck
pnpm --filter happy-cli typecheck
pnpm --filter happy-agent typecheck
```

## License

[GNU AGPL v3](LICENSE). The original Happy MIT notice is preserved in [NOTICE](NOTICE).
