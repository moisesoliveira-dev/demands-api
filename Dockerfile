# ─────────────── deps ───────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ─────────────── build ──────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Garante que o artefato existe antes de prosseguir
    RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found after build" && exit 1)
    
    # ────────────── runtime ─────────────
    FROM node:20-alpine AS runtime
    WORKDIR /app
    RUN apk add --no-cache openssl libc6-compat
    ENV NODE_ENV=production
    COPY --from=build /app/node_modules ./node_modules
    COPY --from=build /app/dist ./dist
    COPY --from=build /app/prisma ./prisma
    COPY package.json ./
    
    EXPOSE 3000
    # Aplica migrations (ou cria schema com db push em modo memory) antes de iniciar.
    CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
