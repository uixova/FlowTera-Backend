# ══════════════════════════════════════════════════════════════════
#  FlowTera — node-core-service Dockerfile
#  Build context: proje kökü (docker-compose context: .)
#  Prisma şeması: ../database/prisma/schema.prisma (package.json ile)
# ══════════════════════════════════════════════════════════════════

# Aşama 1: Derleme 
FROM node:20-alpine AS builder

# bcrypt native binding + openssl (Prisma)
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Prisma şemasını beklenen göreli konuma kopyala
# package.json → "schema": "../database/prisma/schema.prisma"
COPY database/ /database/

# Önce sadece bağımlılık dosyaları (Docker katman cache için)
COPY node-core-service/package*.json ./
RUN npm ci

# Kaynak kodlar ve tsconfig
COPY node-core-service/src/          ./src/
COPY node-core-service/tsconfig.json  ./

# Prisma Client üret (package.json'daki schema yolunu kullanır)
RUN npx prisma generate

# TypeScript → JavaScript
RUN npx tsc --project tsconfig.json

# Aşama 2: Çalışma zamanı 
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

# Sadece üretim bağımlılıkları
COPY node-core-service/package*.json ./
RUN npm ci --omit=dev

# Derlenmiş uygulama
COPY --from=builder /app/dist                  ./dist

# Prisma runtime client (native binary dahil)
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma

# Şema dosyası (çalışma zamanında da gerekli)
COPY --from=builder /database/                 /database/

EXPOSE 3001

# Graceful shutdown için dumb-init istemiyorsa node yeterli
CMD ["node", "dist/server.js"]
