# ── Stage 1: Build React client ─────────────────────────────────────────────
FROM node:20-slim AS client-builder

WORKDIR /app

COPY package.json ./
COPY src/client/package.json ./src/client/

RUN npm install --workspace=src/client

COPY src/client ./src/client
RUN npm run build --workspace=src/client

# ── Stage 2: Build server + generate Prisma client ──────────────────────────
FROM node:20-slim AS server-builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY src/server/package.json ./src/server/
COPY src/prisma/schema.prisma ./src/prisma/

RUN npm install --workspace=src/server

COPY src/server ./src/server

RUN cd src/server && npx prisma generate --schema=../prisma/schema.prisma

# ── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY src/server/package.json ./src/server/
COPY src/prisma/schema.prisma ./src/prisma/

RUN npm install --workspace=src/server --omit=dev

COPY --from=client-builder /app/src/client/dist ./src/client/dist
COPY --from=server-builder /app/src/server ./src/server

COPY src/server/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["./entrypoint.sh"]
