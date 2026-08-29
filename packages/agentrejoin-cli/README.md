# AgentRejoin CLI

Code on the go — control AI coding agents from your phone, browser, or terminal.

Free. Open source. Code anywhere.

## Installation

```bash
npm install -g agentrejoin
```

## Usage

### Claude Code (default)

```bash
agentrejoin
# or
agentrejoin claude
```

This will:
1. Start a Claude Code session
2. Display a QR code to connect from your mobile device or browser
3. Allow real-time session control — all communication is end-to-end encrypted
4. Start new sessions directly from your phone or web while your computer is online

### More agents

```
agentrejoin codex
agentrejoin agy        # Antigravity CLI (Gemini's successor)
agentrejoin gemini     # deprecated — use `agentrejoin agy`
agentrejoin openclaw

# or any ACP-compatible CLI
agentrejoin acp opencode
agentrejoin acp -- custom-agent --flag
```

> **Note on agy permissions:** the agy backend runs `agy --print`, which is
> one-shot and has no interactive approval surface — tool calls proceed
> automatically without ever prompting you. The permission mode you pick in
> AgentRejoin only chooses which flag is passed to agy: the default modes use
> `--sandbox`, and the bypass/yolo-style modes (including `acceptEdits`) use
> `--dangerously-skip-permissions`. Neither adds a per-tool approval gate
> inside AgentRejoin, so selecting "default" for an agy session does **not** give
> you an approval prompt the way it does for Claude Code.

## Daemon

The daemon is a background service that stays running on your machine. It lets you spawn and manage coding sessions remotely — from your phone or the web app — without needing an open terminal.

```bash
agentrejoin daemon start
agentrejoin daemon stop
agentrejoin daemon status
agentrejoin daemon list
```

The daemon starts automatically when you run `agentrejoin`, so you usually don't need to manage it manually.

### Keeping the daemon running across reboots

`agentrejoin auth login` asks whether to start the daemon now and whether to start it automatically from your bash or zsh profile. Re-run the login command to change that setting; logging out removes the managed profile entry.

> **macOS users:** prefer this shell-init approach over a `launchd` LaunchAgent. A LaunchAgent runs in an agent domain that is **detached from your GUI/Aqua login session**, which means the bundled `claude-agent-sdk` cannot reach the macOS keychain and silently fails authentication ("Failed to authenticate. API Error: 401 terminated", `duration_api_ms: 0`). If you must use launchd, your wrapper has to read the OAuth access token from `~/.claude/.credentials.json` and export it as `CLAUDE_CODE_OAUTH_TOKEN` before exec'ing the daemon — and you'll need to handle token rotation yourself.

## Authentication

```bash
agentrejoin auth login
agentrejoin auth logout
```

AgentRejoin uses cryptographic key pairs for authentication - your private key stays on your machine. All session data is end-to-end encrypted before leaving your device.

To connect third-party agent APIs:

```bash
agentrejoin connect gemini
agentrejoin connect claude
agentrejoin connect codex
agentrejoin connect status
```

## Commands

| Command | Description |
|---------|-------------|
| `agentrejoin` | Start Claude Code session (default) |
| `agentrejoin codex` | Start Codex mode |
| `agentrejoin agy` | Start agy (Antigravity CLI) session |
| `agentrejoin gemini` | Start Gemini CLI session (**deprecated** — use `agentrejoin agy`) |
| `agentrejoin openclaw` | Start OpenClaw session |
| `agentrejoin acp` | Start any ACP-compatible agent |
| `agentrejoin resume <id>` | Resume a previous session |
| `agentrejoin notify` | Send push notification to your devices |
| `agentrejoin doctor` | Diagnostics & troubleshooting |

---

## Advanced

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTREJOIN_SERVER_URL` | Custom server URL (default: `https://agentrejoin.zhandj.com`) |
| `AGENTREJOIN_WEBAPP_URL` | Custom web app URL (default: `https://agentrejoin.zhandj.com/app`) |
| `AGENTREJOIN_HOME_DIR` | Custom home directory for AgentRejoin data (default: `~/.agentrejoin`) |
| `AGENTREJOIN_DISABLE_CAFFEINATE` | Disable macOS sleep prevention |
| `AGENTREJOIN_EXPERIMENTAL` | Enable experimental features |

### Sandbox (experimental)

AgentRejoin can run agents inside an OS-level sandbox to restrict file system and network access.

```bash
agentrejoin sandbox configure
agentrejoin sandbox status
agentrejoin sandbox disable
```

### Building from source

```bash
git clone https://github.com/Altman-conquer/agentrejoin
cd agentrejoin
yarn install
yarn workspace agentrejoin cli --help
```

## Requirements

- Node.js >= 20.0.0
- For Claude: `claude` CLI installed & logged in
- For Codex: `codex` CLI installed & logged in
- For agy: install the Antigravity CLI (`agy`) and log in
- For Gemini (**deprecated** — use agy): `npm install -g @google/gemini-cli` + `agentrejoin connect gemini`

## License

GNU AGPL v3 - see the repository root [LICENSE](../../LICENSE).
