# Standalone happy-server: single container, no external dependencies
# Uses PGlite (embedded Postgres), local filesystem storage, no Redis

# Stage 1: install dependencies
FROM node:20 AS deps

RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY scripts ./scripts
COPY patches ./patches

RUN mkdir -p packages/happy-app packages/happy-server packages/happy-cli packages/happy-agent packages/happy-wire

COPY packages/happy-app/package.json packages/happy-app/
COPY packages/happy-server/package.json packages/happy-server/
COPY packages/happy-cli/package.json packages/happy-cli/
COPY packages/happy-agent/package.json packages/happy-agent/
COPY packages/happy-wire/package.json packages/happy-wire/

# Workspace postinstall requirements
COPY packages/happy-app/patches packages/happy-app/patches
COPY packages/happy-server/prisma packages/happy-server/prisma
COPY packages/happy-cli/scripts packages/happy-cli/scripts
COPY packages/happy-cli/tools packages/happy-cli/tools

RUN SKIP_HAPPY_WIRE_BUILD=1 pnpm install --frozen-lockfile

# Stage 2: copy source and type-check
FROM deps AS builder

COPY packages/happy-wire ./packages/happy-wire
COPY packages/happy-server ./packages/happy-server
COPY packages/happy-app ./packages/happy-app

RUN pnpm --filter @slopus/happy-wire --fail-if-no-match build
RUN pnpm --filter happy-server --fail-if-no-match build
RUN APP_ENV=production NODE_ENV=production pnpm --filter happy-app exec expo export --platform web --output-dir dist
RUN pnpm --filter happy-server deploy --prod --legacy /repo/runtime
RUN cd /repo/runtime && node_modules/.bin/prisma generate --schema=prisma/schema.prisma --generator client

# Stage 3: runtime
FROM node:20-slim AS runner

WORKDIR /repo

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PGLITE_DIR=/data/pglite
ENV HAPPY_STATIC_DIR=/repo/webapp

COPY --from=builder /repo/runtime /repo
COPY --from=builder /repo/packages/happy-app/dist /repo/webapp

VOLUME /data
EXPOSE 3005

CMD ["sh", "-c", "node_modules/.bin/tsx sources/standalone.ts migrate && exec node_modules/.bin/tsx sources/standalone.ts serve"]
