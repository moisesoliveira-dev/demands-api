#!/bin/sh
set -e

echo "→ Aplicando migrations pendentes..."
npx prisma migrate deploy

echo "→ Criando usuário admin inicial (ignora se banco já tiver usuários)..."
npx ts-node -r tsconfig-paths/register scripts/create-admin.ts || true

echo "→ Iniciando API..."
exec node dist/src/main.js
