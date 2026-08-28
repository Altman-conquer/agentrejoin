#!/bin/sh
set -eu

codex --version
claude --version
node /repo/packages/agentrejoin-cli/dist/index.mjs auth login > /state/auth.log 2>&1
exec tail -f /dev/null
