#!/bin/sh
set -e

echo "→ Baseline migration (idempotente — ignora se já registrada)..."
npx prisma migrate resolve --applied 20260506144955_init || true

echo "→ Aplicando migrations pendentes..."
npx prisma migrate deploy

echo "→ Criando usuário admin inicial (ignora se banco já tiver usuários)..."
npx ts-node -r tsconfig-paths/register scripts/create-admin.ts || true

echo "→ Iniciando API..."
exec node dist/src/main.js
