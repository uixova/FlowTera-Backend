# 🌊 FlowTera Backend

> **Kurumsal Harcama & Seyahat Yönetim Platformu** — Çok katmanlı Node.js + Python mikroservis mimarisi

[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-purple?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

---

## 📋 İçindekiler

- [Sistem Amacı](#-sistem-amacı)
- [Mimari](#-mimari)
- [Modüller](#-modüller)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Kurulum (Geliştirme)](#-kurulum-geliştirme)
- [Docker ile Çalıştırma](#-docker-ile-çalıştırma)
- [Ortam Değişkenleri](#-ortam-değişkenleri)
- [API Yapısı](#-api-yapısı)
- [RBAC Yetki Sistemi](#-rbac-yetki-sistemi)
- [WebSocket Olayları](#-websocket-olayları)
- [Veritabanı](#-veritabanı)
- [Proje Yapısı](#-proje-yapısı)

---

## 🎯 Sistem Amacı

FlowTera, şirket içi **harcama ve seyahat taleplerini dijitalleştiren** ve merkezi bir onay akışına bağlayan kurumsal yönetim platformudur.

**Çözülen problemler:**

| Problem | FlowTera Çözümü |
|---|---|
| Kağıt tabanlı harcama formu | OCR ile faturadan otomatik veri çıkarma |
| Manuel onay süreci | Gerçek zamanlı WebSocket bildirimli onay akışı |
| Takım bazlı yetki karmaşası | Deny-list RBAC — admin sıfırlar, üye kısıtlanır |
| Harcama analizi yok | Python ML servisi + AI destekli sınıflandırma |
| Fatura kaybı | AWS S3 kalıcı depolama + arşiv modülü |

---

## 🏗 Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                     İstemci Katmanı                         │
│         React 18 + Vite  (port 3000)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                     API Gateway                             │
│         Node.js + Express  (port 3002)                      │
│  • Rate limiting  • Helmet güvenlik başlıkları              │
│  • Internal API key doğrulama  • Servis proxy'si            │
└───────────────┬─────────────────────┬───────────────────────┘
                │                     │
┌───────────────▼──────────┐  ┌───────▼──────────────────────┐
│   Node Core Service      │  │   Python ML Service          │
│   Node.js + Express      │  │   FastAPI + uvicorn          │
│   (port 3001)            │  │   (port 8000)                │
│                          │  │                              │
│  • Auth & JWT            │  │  • OCR (Gemini / OpenAI)    │
│  • Kullanıcı yönetimi    │  │  • Fatura veri çıkarma      │
│  • Takım & üye           │  │  • Harcama analizi          │
│  • Harcama & seyahat     │  │  • AI kategori tespiti      │
│  • Onay akışı            │  │  • Rapor oluşturma          │
│  • WebSocket (Socket.io) │  │  • PDF işleme               │
│  • Stripe ödeme          │  │                              │
│  • AWS S3 yükleme        │  └───────────────────────────────┘
│  • Nodemailer e-posta    │
└──────────┬───────────────┘
           │  Prisma ORM
┌──────────▼───────────────┐   ┌────────────────────────────┐
│   PostgreSQL 16          │   │   Redis 7                  │
│   (port 5432)            │   │   (port 6379)              │
│   Ana veri deposu        │   │   Oturum / önbellek        │
└──────────────────────────┘   └────────────────────────────┘
                │
        ┌───────▼────────┐
        │   AWS S3       │
        │  Fatura/dosya  │
        │  depolama      │
        └────────────────┘
```

**Servisler arası iletişim:** HTTP + Internal API Key doğrulama (dosya paylaşımı yok)

---

## 📦 Modüller

### Node Core Service Modülleri

| Modül | Endpoint | Açıklama |
|---|---|---|
| `auth` | `/api/v1/auth` | Kayıt, giriş, JWT, e-posta doğrulama, şifre sıfırlama |
| `users` | `/api/v1/users` | Profil yönetimi, avatar, hesap silme |
| `teams` | `/api/v1/teams` | Takım oluşturma/silme, davet kodu, ayarlar |
| `expenses` | `/api/v1/expenses` | Harcama CRUD, onay akışı, analiz dışa aktarma |
| `trips` | `/api/v1/trips` | Seyahat talebi CRUD, onay akışı |
| `requests` | `/api/v1/requests` | Admin onay/red, bildirim ile cascade güncelleme |
| `notifications` | `/api/v1/notifications` | Bildirim listeleme, okundu işaretleme |
| `uploads` | `/api/v1/uploads` | AWS S3 imzalı URL, dosya yükleme |
| `archive` | `/api/v1/archive` | Onaylanmış harcama/seyahat arşivi |
| `logs` | `/api/v1/logs` | Kullanıcı aktivite log görüntüleme |
| `payments` | `/api/v1/payments` | Stripe abonelik ödeme, webhook |
| `plans` | `/api/v1/plans` | Abonelik planları listeleme |
| `subscriptions` | `/api/v1/subscriptions` | Aktif abonelik yönetimi |

### Python ML Service Endpoint'leri

| Endpoint | Açıklama |
|---|---|
| `POST /ocr/extract` | Görüntü/PDF'den fatura verisi çıkar |
| `POST /analysis/expenses` | Harcama verisini AI ile analiz et |
| `GET  /reports/summary` | Dönem özet raporu |
| `GET  /health` | Servis sağlık durumu |

---

## 🛠 Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Dil | TypeScript | 5.x |
| Web Framework | Express | 5.x |
| ORM | Prisma | 7.x |
| Veritabanı | PostgreSQL | 16 |
| Önbellek | Redis | 7 |
| WebSocket | Socket.io | 4.x |
| Kimlik doğrulama | JWT (jsonwebtoken) | 9.x |
| Şifreleme | bcrypt | 6.x |
| Doğrulama | Zod | 4.x |
| E-posta | Nodemailer (Brevo SMTP) | 8.x |
| Ödeme | Stripe | 22.x |
| Depolama | AWS S3 SDK v3 | 3.x |
| ML Runtime | Python + FastAPI | 3.11 / 0.136 |
| OCR AI | Google Gemini / OpenAI | - |
| PDF | PyMuPDF + pdfplumber | - |
| Container | Docker + Compose | - |

---

## 🚀 Kurulum (Geliştirme)

### Ön Gereksinimler

- Node.js 20+
- Python 3.11+
- PostgreSQL 16
- Redis 7

### 1. Bağımlılıkları Yükle

```bash
# Proje kökünde
npm install

# Node Core Service
cd node-core-service && npm install

# API Gateway
cd api-gateway && npm install

# Python ML Service
cd python-ml-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Ortam Değişkenlerini Yapılandır

```bash
# Her servis için .env oluştur
cp node-core-service/.env.example  node-core-service/.env
cp api-gateway/.env.example        api-gateway/.env
cp python-ml-service/.env.example  python-ml-service/.env
```

`.env` dosyalarını kendi değerlerinizle doldurun (bkz. [Ortam Değişkenleri](#-ortam-değişkenleri)).

### 3. Veritabanını Hazırla

```bash
cd node-core-service

# Migrasyonları uygula
npx prisma migrate deploy

# Prisma Client üret
npx prisma generate

# (İsteğe bağlı) Seed verisi
npx prisma db seed
```

### 4. Servisleri Başlat

Her servis ayrı terminal penceresinde çalışır:

```bash
# Terminal 1 — Node Core Service (port 3001)
cd node-core-service
npm run dev

# Terminal 2 — API Gateway (port 3002)
cd api-gateway
npm run dev

# Terminal 3 — Python ML Service (port 8000)
cd python-ml-service
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 4 — Frontend (port 3000) — ayrı repo
cd FlowTera-Frontend
npm run dev
```

---

## 🐳 Docker ile Çalıştırma

### Geliştirme Ortamı

```bash
# Tüm servisleri derle ve başlat
docker compose up --build

# Arka planda çalıştır
docker compose up -d --build

# Logları izle
docker compose logs -f

# Belirli servis logu
docker compose logs -f node-core

# Durdur ve kaldır
docker compose down

# Volume'ları da sil (veritabanı sıfırlanır!)
docker compose down -v
```

### Üretim Ortamı (VPS)

```bash
# .env.prod dosyası hazırla (asla git'e commit etme!)
cp .env.example .env.prod
# Düzenle: .env.prod

# Üretim compose ile başlat
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Durum kontrol
docker compose -f docker-compose.prod.yml ps

# Tek servisi güncelle (downtime olmadan)
docker compose -f docker-compose.prod.yml up -d --no-deps --build node-core

# Tüm loglar
docker compose -f docker-compose.prod.yml logs -f
```

### Veritabanı Migrasyonu (Docker Ortamı)

```bash
# Çalışan node-core container içinde migrasyon
docker compose exec node-core npx prisma migrate deploy
```

### Servis URL'leri (Docker)

| Servis | İç ağ URL | Dış port |
|---|---|---|
| Node Core | `http://node-core:3001` | `3001` |
| Python ML | `http://python-ml:8000` | `8000` |
| API Gateway | `http://api-gateway:3002` | `3002` |
| PostgreSQL | `postgres:5432` | sadece iç ağ |
| Redis | `redis:6379` | sadece iç ağ |

> **Not:** Üretimde sadece API Gateway (3002) dışarıya açılır. Nginx/Caddy bu porta reverse proxy yapmalıdır.

---

## ⚙️ Ortam Değişkenleri

### node-core-service/.env

```env
# Sunucu
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Veritabanı
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/flowtera

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=cok_gizli_anahtar_buraya
JWT_EXPIRES_IN=7d

# Internal Auth (API Gateway → Core iletişimi)
INTERNAL_API_KEY=gizli_dahili_anahtar

# AWS S3
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=flowtera-documents

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# E-posta (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=abc@smtp-brevo.com
SMTP_PASS=sifre
FROM_EMAIL=help.flowtera@gmail.com
```

### api-gateway/.env

```env
PORT=3002
NODE_SERVICE_URL=http://localhost:3001
PYTHON_SERVICE_URL=http://localhost:8000
INTERNAL_API_KEY=gizli_dahili_anahtar
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### python-ml-service/.env

```env
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/flowtera
INTERNAL_API_KEY=gizli_dahili_anahtar
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-4o-mini
DB_POOL_MIN=2
DB_POOL_MAX=10
```

---

## 🔌 API Yapısı

```
API Gateway (port 3002)
│
├── /api/v1/auth/*          → Node Core
├── /api/v1/users/*         → Node Core
├── /api/v1/teams/*         → Node Core
├── /api/v1/expenses/*      → Node Core
├── /api/v1/trips/*         → Node Core
├── /api/v1/requests/*      → Node Core
├── /api/v1/notifications/* → Node Core
├── /api/v1/uploads/*       → Node Core
├── /api/v1/archive/*       → Node Core
├── /api/v1/logs/*          → Node Core
├── /api/v1/payments/*      → Node Core
├── /api/v1/plans/*         → Node Core
├── /api/v1/subscriptions/* → Node Core
│
├── /ml/ocr/*               → Python ML
├── /ml/analysis/*          → Python ML
└── /ml/reports/*           → Python ML
```

**Kimlik doğrulama:** `Authorization: Bearer <JWT_TOKEN>` başlığı

---

## 🛡️ RBAC Yetki Sistemi

FlowTera **Deny-List tabanlı RBAC** kullanır:

- Her `TeamMember`'ın `permissions[]` dizisi **engellenen** izinleri tutar
- **Boş dizi** = tam erişim
- **Admin rolü** = deny list her zaman boş (tüm izinler açık)
- Yönetici admin panelinden üye izinlerini düzenleyebilir

### İzin Anahtarları

| Anahtar | Engellenen Eylem |
|---|---|
| `view_archive` | Arşiv sayfasını görme |
| `view_analytics` | Analiz dashboard'unu görme |
| `manage_requests` | İstek yönetimi |
| `member_add` | Yeni üye ekleme |
| `member_remove` | Üye çıkarma |
| `view_user_log` | Kullanıcı log kayıtlarını görme |
| `team_settings` | Takım ayarlarına erişim |
| `trip_create` | Seyahat talebi oluşturma |
| `free_exit` | Serbest çıkış |
| `create_report` | Rapor/analiz dışa aktarma |
| `view_invoice_details` | Fatura detaylarını görme |

---

## 📡 WebSocket Olayları

Bağlantı: `ws://localhost:3001/ws`

| Olay | Yön | Açıklama |
|---|---|---|
| `notification:new` | Server → Client | Yeni bildirim |
| `request:update` | Server → Admin | Onay bekleyen istek güncellendi |
| `expense:approved` | Server → Client | Harcama onaylandı |
| `expense:rejected` | Server → Client | Harcama reddedildi |
| `trip:approved` | Server → Client | Seyahat onaylandı |
| `trip:rejected` | Server → Client | Seyahat reddedildi |

---

## 🗃️ Veritabanı

Şema: [`database/prisma/schema.prisma`](database/prisma/schema.prisma)

**Ana tablolar:**

| Tablo | Açıklama |
|---|---|
| `User` | Kullanıcı profili, kimlik doğrulama bilgileri |
| `Team` | Takım bilgisi, davet kodu, ayarlar |
| `TeamMember` | Kullanıcı–Takım ilişkisi, rol, deny-list izinler |
| `Expense` | Harcama kaydı, OCR verisi, onay durumu |
| `Trip` | Seyahat talebi, onay durumu |
| `Notification` | Sistem bildirimleri + onay isteği kuyruğu |
| `AuditLog` | Tüm işlem kaydı (kim, ne, ne zaman) |
| `Subscription` | Stripe abonelik verisi |
| `Plan` | Abonelik planları |

---

## 📁 Proje Yapısı

```
FlowTera-Backend/
│
├── database/
│   └── prisma/
│       ├── schema.prisma          # Paylaşılan Prisma şeması
│       └── migrations/            # Veritabanı migrasyon geçmişi
│
├── node-core-service/
│   ├── src/
│   │   ├── app.ts                 # Express app, middleware zinciri
│   │   ├── server.ts              # HTTP sunucu, WebSocket init
│   │   ├── config/                # Prisma, env, WebSocket config
│   │   ├── middlewares/           # auth, rbac, teamGuard, validate
│   │   ├── modules/               # Her iş alanı: controller/service/routes
│   │   └── utils/                 # logger, notifyTrigger, helpers
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── api-gateway/
│   ├── src/
│   │   ├── app.ts                 # Gateway Express app
│   │   ├── server.ts              # Gateway HTTP sunucu
│   │   ├── config/env.ts          # Servis URL'leri, rate limit config
│   │   ├── middlewares/           # Rate limiter, güvenlik başlıkları
│   │   └── proxy/                 # http-proxy-middleware tanımları
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── python-ml-service/
│   ├── app/
│   │   ├── main.py                # FastAPI uygulama, lifespan
│   │   ├── config.py              # Pydantic Settings
│   │   ├── routes/                # ocr, analysis, reports endpoint'leri
│   │   ├── core/                  # ai_parser, OCR motoru
│   │   ├── middlewares/           # internal auth, hata yakalama
│   │   └── schemas/               # Pydantic istek/yanıt modelleri
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml             # Geliştirme ortamı
├── docker-compose.prod.yml        # Üretim ortamı
├── .dockerignore
└── README.md
```

---

## 🔒 Güvenlik Notları

- `.env` dosyaları **asla** git'e commit edilmez
- Üretimde `JWT_SECRET` minimum 64 karakter rastgele değer olmalıdır
- `INTERNAL_API_KEY` servisler arası iletişimi korur — güçlü tutun
- Redis şifresi üretimde zorunludur (`REDIS_PASSWORD`)
- PostgreSQL üretimde iç ağda tutulur, dışarıya port açılmaz
- Stripe webhook secret her ortam için ayrı üretilir

---

## 📄 Lisans

Bu yazılım özel mülkiyet lisansı altında korunmaktadır.
Tüm hakları saklıdır. Bkz. [LICENSE](LICENSE)

---

*FlowTera Backend — © 2025-2026 uixova. Tüm hakları saklıdır.*
