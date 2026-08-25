# AgentRejoin control CLI

CLI client for controlling AgentRejoin sessions remotely.

Unlike `agentrejoin-cli` which both runs and controls agents, `agentrejoin-agent` only controls them — listing machines, spawning sessions on a machine, creating sessions, sending messages, reading history, monitoring state, and stopping sessions.

## Installation

From the monorepo:

```bash
yarn workspace agentrejoin-agent build
```

Or link globally:

```bash
cd packages/agentrejoin-agent && npm link
```

## Authentication

The control CLI uses account authentication via QR code, the same flow as linking a device in the AgentRejoin app.

```bash
# Authenticate by scanning the QR code with AgentRejoin
agentrejoin-agent auth login

# Check authentication status
agentrejoin-agent auth status

# Clear stored credentials
agentrejoin-agent auth logout
```

Credentials are stored at `~/.agentrejoin/agent.key`.

## Commands

### List sessions

```bash
# List all sessions
agentrejoin-agent list

# List only active sessions
agentrejoin-agent list --active

# Output as JSON
agentrejoin-agent list --json
```

### List machines

```bash
# List all machines
agentrejoin-agent machines

# List only active machines
agentrejoin-agent machines --active

# Output as JSON
agentrejoin-agent machines --json
```

### Spawn on a machine

```bash
# Spawn a session on a specific machine
agentrejoin-agent spawn --machine <machine-id> --path ~/project

# Let the daemon create the directory if needed
agentrejoin-agent spawn --machine <machine-id> --path ~/new-project --create-dir

# Choose a specific agent
agentrejoin-agent spawn --machine <machine-id> --path ~/project --agent codex

# Output as JSON
agentrejoin-agent spawn --machine <machine-id> --path ~/project --json
```

### Session status

```bash
# Get live session state (supports ID prefix matching)
agentrejoin-agent status <session-id>

# Output as JSON
agentrejoin-agent status <session-id> --json
```

### Create a session

```bash
# Create a new session with a tag
agentrejoin-agent create --tag my-project

# Specify a working directory
agentrejoin-agent create --tag my-project --path /home/user/project

# Output as JSON
agentrejoin-agent create --tag my-project --json
```

### Send a message

```bash
# Send a message to a session
agentrejoin-agent send <session-id> "Fix the login bug"

# Send with yolo permissions
agentrejoin-agent send <session-id> "Ship it" --yolo

# Send and wait for the agent to finish
agentrejoin-agent send <session-id> "Run the tests" --wait

# Output as JSON
agentrejoin-agent send <session-id> "Hello" --json
```

### Message history

```bash
# View message history
agentrejoin-agent history <session-id>

# Limit to last N messages
agentrejoin-agent history <session-id> --limit 10

# Output as JSON
agentrejoin-agent history <session-id> --json
```

### Stop a session

```bash
agentrejoin-agent stop <session-id>
```

### Wait for idle

```bash
# Wait for agent to become idle (default 300s timeout)
agentrejoin-agent wait <session-id>

# Custom timeout
agentrejoin-agent wait <session-id> --timeout 60
```

Exit code 0 when agent becomes idle, 1 on timeout.

## Environment Variables

- `AGENTREJOIN_SERVER_URL` - API server URL (default: `https://agentrejoin.zhandj.com`)
- `AGENTREJOIN_HOME_DIR` - Home directory for credential storage (default: `~/.agentrejoin`)

## Session ID Matching

All commands that accept a `<session-id>` support prefix matching. You can provide the first few characters of a session ID and the CLI will resolve the full ID.

Machine-aware commands such as `spawn --machine <machine-id>` also support ID prefix matching.

## Encryption

All machine and session data is end-to-end encrypted. New records use AES-256-GCM with per-record keys. Existing records created by other clients are decrypted using the appropriate key scheme (AES-256-GCM or legacy NaCl secretbox).

## Requirements

- Node.js >= 20.0.0
- An AgentRejoin account for authentication

## Publishing to npm

Maintainers can publish a new version:

```bash
yarn release               # From repo root: choose library to release
# or directly:
yarn workspace agentrejoin-agent release
```

This flow:
- runs tests/build checks via `prepublishOnly`
- creates a release commit and `agentrejoin-agent-vX.Y.Z` tag
- creates a GitHub release with generated notes
- publishes `agentrejoin-agent` to npm

## License

GNU AGPL v3 - see the repository root [LICENSE](../../LICENSE).
