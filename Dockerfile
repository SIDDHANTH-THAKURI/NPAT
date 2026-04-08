# ── Stage 1: Build React client ─────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app

# Copy workspace manifests first (cache-friendly)
COPY package.json ./
COPY src/client/package.json ./src/client/

# Install client deps
RUN npm install --workspace=src/client

# Copy client source and build
COPY src/client ./src/client
RUN npm run build --workspace=src/client

# ── Stage 2: Build server + generate Prisma client ──────────────────────────
FROM node:20-alpine AS server-builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json ./
COPY src/server/package.json ./src/server/
COPY src/prisma/schema.prisma ./src/prisma/

RUN npm install --workspace=src/server

# Copy server source
COPY src/server ./src/server

# Generate Prisma client
RUN cd src/server && npx prisma generate --schema=../prisma/schema.prisma

# ── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

# Only production deps
COPY package.json ./
COPY src/server/package.json ./src/server/
COPY src/prisma/schema.prisma ./src/prisma/

RUN npm install --workspace=src/server --omit=dev

# Copy built artifacts
COPY --from=client-builder /app/src/client/dist ./src/client/dist
COPY --from=server-builder /app/src/server ./src/server

# Prisma migration entrypoint
COPY src/server/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["./entrypoint.sh"]
