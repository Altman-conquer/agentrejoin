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

Install the AgentRejoin CLI and connect this machine:

```bash
npm install -g agentrejoin
agentrejoin auth login
agentrejoin daemon start
```

Run an agent through the connected CLI:

```bash
agentrejoin claude
agentrejoin codex
agentrejoin gemini       # deprecated upstream; prefer agy
agentrejoin openclaw
agentrejoin agy          # Antigravity CLI
agentrejoin acp opencode # any supported ACP agent
```

| Agent CLI | Start and control remotely | Discover existing local history |
| --- | --- | --- |
| Claude Code | Yes | Yes |
| Codex | Yes | Yes |
| Gemini | Yes | Yes |
| OpenClaw | Yes | No |
| Antigravity (`agy`) | Yes | No |
| ACP-compatible agents | Yes | No |

Existing-history discovery is currently available for Claude Code, Codex, and Gemini.
The other integrations expose live sessions, not a stable on-disk history format.

Resume a known AgentRejoin session from the terminal:

```bash
agentrejoin resume <session-id>
```

For the remote control CLI:

```bash
npm install -g agentrejoin-agent
agentrejoin-agent auth login
agentrejoin-agent machines
agentrejoin-agent list
agentrejoin-agent resume <session-id>
```

## How it works

The server daemon indexes supported coding-agent sessions on that machine. The
web or mobile client requests a resume through the encrypted relay; the daemon
then reattaches the underlying Claude Code session or Codex thread and streams
new messages back to the client. The relay handles encrypted synchronization
but cannot read conversation content.

## Repository

- `packages/agentrejoin-app` - Expo web and mobile client, plus the Tauri desktop shell
- `packages/agentrejoin-cli` - coding-agent runtime and machine daemon
- `packages/agentrejoin-agent` - remote session control CLI
- `packages/agentrejoin-server` - encrypted synchronization relay
- `packages/agentrejoin-server-self-host` - self-hosted relay and bundled web app

## Development

```bash
pnpm install
pnpm --filter agentrejoin-app web
```

Run focused checks before submitting changes:

```bash
pnpm --filter agentrejoin-app typecheck
pnpm --filter agentrejoin typecheck
pnpm --filter agentrejoin-agent typecheck
```

## License

[GNU AGPL v3](LICENSE). Third-party copyright notices are preserved in [NOTICE](NOTICE).
