# ══════════════════════════════════════════════════════════════════
#  FlowTera — api-gateway Dockerfile
#  Build context: api-gateway/
# ══════════════════════════════════════════════════════════════════

# Aşama 1: Derleme 
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/          ./src/
COPY tsconfig.json ./

# TypeScript → JavaScript
RUN npx tsc --project tsconfig.json

# Aşama 2: Çalışma zamanı 
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD ["node", "dist/server.js"]
