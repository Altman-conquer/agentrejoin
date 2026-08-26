# Standalone agentrejoin-server: single container, no external dependencies
# Uses PGlite (embedded Postgres), local filesystem storage, no Redis

# Stage 1: install dependencies
FROM node:20 AS deps

RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY scripts ./scripts
COPY patches ./patches

RUN mkdir -p packages/agentrejoin-app packages/agentrejoin-server packages/agentrejoin-cli packages/agentrejoin-agent packages/agentrejoin-wire

COPY packages/agentrejoin-app/package.json packages/agentrejoin-app/
COPY packages/agentrejoin-server/package.json packages/agentrejoin-server/
COPY packages/agentrejoin-cli/package.json packages/agentrejoin-cli/
COPY packages/agentrejoin-agent/package.json packages/agentrejoin-agent/
COPY packages/agentrejoin-wire/package.json packages/agentrejoin-wire/

# Workspace postinstall requirements
COPY packages/agentrejoin-app/patches packages/agentrejoin-app/patches
COPY packages/agentrejoin-server/prisma packages/agentrejoin-server/prisma
COPY packages/agentrejoin-cli/scripts packages/agentrejoin-cli/scripts
COPY packages/agentrejoin-cli/tools packages/agentrejoin-cli/tools

RUN ELECTRON_SKIP_BINARY_DOWNLOAD=1 SKIP_AGENTREJOIN_WIRE_BUILD=1 pnpm install --frozen-lockfile

# Stage 2: copy source and type-check
FROM deps AS builder

COPY packages/agentrejoin-wire ./packages/agentrejoin-wire
COPY packages/agentrejoin-server ./packages/agentrejoin-server
COPY packages/agentrejoin-app ./packages/agentrejoin-app

RUN pnpm --filter agentrejoin-wire --fail-if-no-match build
RUN pnpm --filter agentrejoin-server --fail-if-no-match build
RUN APP_ENV=production NODE_ENV=production pnpm --filter agentrejoin-app exec expo export --platform web --output-dir dist
RUN pnpm --filter agentrejoin-server deploy --prod --legacy /repo/runtime
RUN cd /repo/runtime && node_modules/.bin/prisma generate --schema=prisma/schema.prisma --generator client

# Stage 3: runtime
FROM node:20-slim AS runner

WORKDIR /repo

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PGLITE_DIR=/data/pglite
ENV AGENTREJOIN_STATIC_DIR=/repo/webapp

COPY --from=builder /repo/runtime /repo
COPY --from=builder /repo/packages/agentrejoin-app/dist /repo/webapp

VOLUME /data
EXPOSE 3005

CMD ["sh", "-c", "node_modules/.bin/tsx sources/standalone.ts migrate && exec node_modules/.bin/tsx sources/standalone.ts serve"]
