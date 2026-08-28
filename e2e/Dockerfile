FROM node:20 AS machine

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ build-essential git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=agentrejoin-pnpm,target=/root/.local/share/pnpm/store \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile --filter agentrejoin... \
    && pnpm --filter agentrejoin-wire --fail-if-no-match build \
    && pnpm --filter agentrejoin --fail-if-no-match build \
    && npm install -g @openai/codex@0.130.0 @anthropic-ai/claude-code@2.1.143

RUN chmod +x /repo/e2e/machine-entrypoint.sh
ENTRYPOINT ["/repo/e2e/machine-entrypoint.sh"]

FROM mcr.microsoft.com/playwright:v1.62.1-noble AS browser

WORKDIR /e2e
RUN npm init -y && npm install playwright@1.62.1
COPY e2e/system.mjs /e2e/system.mjs
CMD ["node", "/e2e/system.mjs"]
