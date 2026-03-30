#!/bin/sh
set -e

echo "Running Prisma migrations…"
cd /app/src/server && npx prisma migrate deploy --schema=/app/src/prisma/schema.prisma

echo "Starting NPAT server…"
exec node /app/src/server/index.js
