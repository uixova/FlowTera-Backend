# Flowtera Backend — Dosya Ağacı

```
flowtera-backend/
│
├── 📄 docker-compose.yml              → Tüm servisleri (Node, Python, Postgres, Redis) tek komutla ayağa kaldırır
├── 📄 docker-compose.prod.yml         → Production ortamı için ayrı compose ayarları
├── 📄 .env.example                    → Geliştiriciler için örnek env değişkenleri şablonu
├── 📄 .gitignore
├── 📄 README.md
│
├── 📁 api-gateway/                    → Tüm dış istekleri tek noktadan karşılar, rate-limit ve routing yapar
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   └── 📁 src/
│       ├── 📄 app.ts                  → Express başlatma, global middleware zinciri
│       ├── 📁 config/
│       │   ├── 📄 env.ts              → Ortam değişkenlerini doğrular ve export eder
│       │   └── 📄 routes.map.ts       → Her path'in hangi servise yönleneceğini tanımlar
│       ├── 📁 middlewares/
│       │   ├── 📄 rateLimiter.ts      → IP bazlı istek sınırlama (Redis destekli)
│       │   ├── 📄 requestLogger.ts    → Gelen her isteği loglar (method, path, latency)
│       │   ├── 📄 correlationId.ts    → Her isteğe izlenebilirlik için UUID atar
│       │   └── 📄 errorHandler.ts     → Gateway seviyesinde hata yakalama ve formatlama
│       ├── 📁 proxy/
│       │   ├── 📄 nodeProxy.ts        → Node core servise istek yönlendirme mantığı
│       │   └── 📄 pythonProxy.ts      → Python ML servise istek yönlendirme mantığı
│       └── 📁 types/
│           └── 📄 gateway.types.ts    → Gateway'e özgü Request/Response tip tanımları
│
├── 📁 node-core-service/              → Ana iş mantığı: Auth, RBAC, Teams, Expenses, Trips, WS
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 .env.example
│   └── 📁 src/
│       ├── 📄 app.ts                  → Express + Socket.IO server kurulumu
│       ├── 📄 server.ts               → HTTP ve WS sunucusunu başlatır, graceful shutdown yönetir
│       │
│       ├── 📁 config/
│       │   ├── 📄 database.ts         → Prisma client başlatma ve bağlantı yönetimi
│       │   ├── 📄 redis.ts            → Redis bağlantısı (session, cache, pub/sub)
│       │   ├── 📄 env.ts              → Zod ile env doğrulama
│       │   └── 📄 constants.ts        → Token süresi, plan limitleri gibi sabit değerler
│       │
│       ├── 📁 types/
│       │   ├── 📄 express.d.ts        → req.user gibi Express tip genişletmeleri
│       │   ├── 📄 common.types.ts     → Tüm servislerde kullanılan genel tip tanımları
│       │   ├── 📄 auth.types.ts       → JWT payload, login/signup request tipleri
│       │   ├── 📄 team.types.ts       → Team, TeamMember, TeamSettings tipleri
│       │   ├── 📄 expense.types.ts    → Expense ve ilgili enum'lar
│       │   ├── 📄 trip.types.ts       → Trip ve ilgili enum'lar
│       │   ├── 📄 notification.types.ts → Bildirim ve talep tipleri
│       │   ├── 📄 rbac.types.ts       → Permission, Role, DenyList tipleri
│       │   └── 📄 pagination.types.ts → PaginatedResponse, CursorPage gibi genel yapılar
│       │
│       ├── 📁 middlewares/
│       │   ├── 📄 authenticate.ts     → JWT doğrulama, req.user'ı doldurur
│       │   ├── 📄 rbac.ts             → Deny-list tabanlı RBAC — kullanıcının o aksiyona izni var mı kontrol eder
│       │   ├── 📄 teamGuard.ts        → Kullanıcının istenen takıma üye olup olmadığını doğrular
│       │   ├── 📄 planGuard.ts        → Plan bazlı feature erişim kontrolü (OCR, archive vb.)
│       │   ├── 📄 validate.ts         → Zod şemalarıyla request body/params doğrulama
│       │   ├── 📄 errorHandler.ts     → Global hata yakalayıcı, hataları tiplendirilmiş response'a çevirir
│       │   └── 📄 notFound.ts         → Tanımsız route'lara 404 döner
│       │
│       ├── 📁 utils/
│       │   ├── 📄 jwt.ts              → Token üretme, doğrulama ve yenileme yardımcıları
│       │   ├── 📄 bcrypt.ts           → Şifre hash/compare sarmalayıcı
│       │   ├── 📄 pagination.ts       → Cursor ve offset tabanlı sayfalama yardımcıları
│       │   ├── 📄 response.ts         → Standart API response formatı üretici
│       │   ├── 📄 cache.ts            → Redis üzerinde TTL cache okuma/yazma yardımcıları
│       │   ├── 📄 currency.ts         → Para birimi dönüşüm yardımcıları
│       │   ├── 📄 dateParser.ts       → DD/MM/YYYY ↔ ISO dönüşümleri
│       │   └── 📄 logger.ts           → Winston tabanlı yapılandırılmış log sistemi
│       │
│       ├── 📁 modules/
│       │   │
│       │   ├── 📁 auth/               → Kimlik doğrulama ve oturum yönetimi
│       │   │   ├── 📄 auth.routes.ts          → /auth/* endpoint tanımları
│       │   │   ├── 📄 auth.controller.ts      → HTTP katmanı — request alır, service çağırır, response döner
│       │   │   ├── 📄 auth.service.ts         → Login, signup, token yenileme iş mantığı
│       │   │   ├── 📄 auth.validators.ts      → Zod şemaları: loginSchema, signupSchema
│       │   │   └── 📄 auth.types.ts           → Auth modülüne özgü tipler
│       │   │
│       │   ├── 📁 users/              → Kullanıcı profil, ayar ve hesap yönetimi
│       │   │   ├── 📄 user.routes.ts
│       │   │   ├── 📄 user.controller.ts      → Profil güncelleme, ayarlar, hesap silme
│       │   │   ├── 📄 user.service.ts         → Kullanıcı sorgulama, güncelleme, soft-delete
│       │   │   ├── 📄 user.validators.ts
│       │   │   └── 📄 user.types.ts
│       │   │
│       │   ├── 📁 teams/              → Takım CRUD, üye yönetimi ve ayarlar
│       │   │   ├── 📄 team.routes.ts
│       │   │   ├── 📄 team.controller.ts      → Takım oluşturma, güncelleme, silme
│       │   │   ├── 📄 team.service.ts         → Takım iş mantığı, plan limiti kontrolü
│       │   │   ├── 📄 member.controller.ts    → Üye ekleme, çıkarma, rol atama
│       │   │   ├── 📄 member.service.ts       → Üyelik değişiklikleri ve bildirim tetikleyici
│       │   │   ├── 📄 team.validators.ts
│       │   │   └── 📄 team.types.ts
│       │   │
│       │   ├── 📁 rbac/               → Deny-list tabanlı rol ve izin sistemi
│       │   │   ├── 📄 rbac.routes.ts
│       │   │   ├── 📄 rbac.controller.ts      → İzin listesi alma, güncelleme
│       │   │   ├── 📄 rbac.service.ts         → Deny-list okuma/yazma, rol şablonları
│       │   │   ├── 📄 rbac.validators.ts
│       │   │   └── 📄 rbac.types.ts           → PermissionKey enum, RoleTemplate tipleri
│       │   │
│       │   ├── 📁 expenses/           → Gider oluşturma, onaylama, raporlama
│       │   │   ├── 📄 expense.routes.ts
│       │   │   ├── 📄 expense.controller.ts   → CRUD endpoint'leri
│       │   │   ├── 📄 expense.service.ts      → Gider iş mantığı, autoApprove kontrolü, limit check
│       │   │   ├── 📄 expense.validators.ts
│       │   │   └── 📄 expense.types.ts
│       │   │
│       │   ├── 📁 trips/              → Seyahat oluşturma, durum yönetimi
│       │   │   ├── 📄 trip.routes.ts
│       │   │   ├── 📄 trip.controller.ts
│       │   │   ├── 📄 trip.service.ts         → Seyahat iş mantığı, "on road" durum geçişleri
│       │   │   ├── 📄 trip.validators.ts
│       │   │   └── 📄 trip.types.ts
│       │   │
│       │   ├── 📁 requests/           → Onay/red talep akışı (Admin onayı gereken işlemler)
│       │   │   ├── 📄 request.routes.ts
│       │   │   ├── 📄 request.controller.ts   → Talep listesi, onay ve red işlemleri
│       │   │   ├── 📄 request.service.ts      → Talep iş mantığı, WS bildirim tetikleyici
│       │   │   ├── 📄 request.validators.ts
│       │   │   └── 📄 request.types.ts
│       │   │
│       │   ├── 📁 notifications/      → Kullanıcı bildirimleri ve okunma takibi
│       │   │   ├── 📄 notification.routes.ts
│       │   │   ├── 📄 notification.controller.ts → Liste, okundu işaretleme, silme
│       │   │   ├── 📄 notification.service.ts    → Bildirim oluşturma, batch gönderme
│       │   │   ├── 📄 notification.validators.ts
│       │   │   └── 📄 notification.types.ts
│       │   │
│       │   ├── 📁 logs/               → Audit log ve aktivite geçmişi
│       │   │   ├── 📄 log.routes.ts
│       │   │   ├── 📄 log.controller.ts       → Takım ve kullanıcı loglarını listeler
│       │   │   ├── 📄 log.service.ts          → Log yazma, sayfalama ve filtreleme
│       │   │   └── 📄 log.types.ts            → TeamLog, UserLog, LogType enum
│       │   │
│       │   ├── 📁 archive/            → Enterprise plan: arşiv kayıtları ve görsel depolama
│       │   │   ├── 📄 archive.routes.ts
│       │   │   ├── 📄 archive.controller.ts
│       │   │   ├── 📄 archive.service.ts      → Arşivlenmiş expense/trip kayıtları, plan kontrolü
│       │   │   └── 📄 archive.types.ts
│       │   │
│       │   ├── 📁 subscriptions/      → Plan yönetimi ve kullanım limitleri
│       │   │   ├── 📄 subscription.routes.ts
│       │   │   ├── 📄 subscription.controller.ts → Plan listesi, aktif plan, yükseltme
│       │   │   ├── 📄 subscription.service.ts    → Plan sınırı kontrolü, OCR limit takibi
│       │   │   ├── 📄 subscription.validators.ts
│       │   │   └── 📄 subscription.types.ts
│       │   │
│       │   └── 📁 payments/           → Ödeme akışı (Stripe/İyzico entegrasyon şablonu)
│       │       ├── 📄 payment.routes.ts
│       │       ├── 📄 payment.controller.ts   → Checkout session oluşturma, webhook alımı
│       │       ├── 📄 payment.service.ts      → Ödeme sağlayıcısı entegrasyonu, plan aktivasyonu
│       │       ├── 📄 payment.validators.ts
│       │       └── 📄 payment.types.ts
│       │
│       └── 📁 web_sockets/            → Socket.IO ile gerçek zamanlı bildirimler
│           ├── 📄 socket.server.ts    → Socket.IO kurulumu, namespace ve oda yönetimi
│           ├── 📄 socket.auth.ts      → WS bağlantısında JWT doğrulama middleware'i
│           ├── 📄 socket.events.ts    → Tüm event isimlerini sabit olarak tanımlar (typo önlemek için)
│           ├── 📄 socket.rooms.ts     → Kullanıcıyı takım ve kişisel odalarına atar
│           └── 📁 handlers/
│               ├── 📄 notification.handler.ts → Bildirim event'lerini dinler ve ilgili odaya gönderir
│               ├── 📄 request.handler.ts      → Talep onay/red event'lerini admin odasına iletir
│               └── 📄 presence.handler.ts     → Kullanıcı online/offline durumu yönetimi
│
├── 📁 python-ml-service/              → OCR, finansal analiz ve kategorizasyon algoritmaları
│   ├── 📄 requirements.txt
│   ├── 📄 Dockerfile
│   ├── 📄 .env.example
│   └── 📁 app/
│       ├── 📄 main.py                 → FastAPI uygulaması başlatma, router kaydı
│       ├── 📄 config.py               → Pydantic Settings ile env okuma
│       │
│       ├── 📁 core/
│       │   ├── 📄 ocr_engine.py       → Tesseract/PaddleOCR ile görüntüden metin çıkarma
│       │   ├── 📄 invoice_parser.py   → OCR metninden tutar, tarih, merchant ayrıştırma
│       │   ├── 📄 category_engine.py  → NLP tabanlı harcama kategorizasyonu
│       │   └── 📄 currency_detector.py → Fatura görselinden para birimi tespiti
│       │
│       ├── 📁 data_processing/
│       │   ├── 📄 expense_analyzer.py  → Harcama trend analizi ve anomali tespiti
│       │   ├── 📄 budget_calculator.py → Bütçe kullanım oranı ve tahmin algoritmaları
│       │   ├── 📄 report_generator.py  → Takım bazlı finansal özet rapor üretimi
│       │   └── 📄 normalizer.py        → Gelen ham veriyi temizleme ve standartlaştırma
│       │
│       ├── 📁 routes/
│       │   ├── 📄 ocr.py              → POST /ocr/scan — Görsel alır, ayrıştırılmış veri döner
│       │   └── 📄 analysis.py         → POST /analysis/run — Finansal analiz çalıştırır
│       │
│       ├── 📁 schemas/
│       │   ├── 📄 ocr.schemas.py      → Pydantic: OCRRequest, OCRResponse tipleri
│       │   └── 📄 analysis.schemas.py → Pydantic: AnalysisRequest, AnalysisResult tipleri
│       │
│       └── 📁 middlewares/
│           ├── 📄 auth.py             → Node servisinden gelen iç token doğrulama
│           └── 📄 error_handler.py    → FastAPI exception handler, standart hata formatı
│
└── 📁 database/                       → PostgreSQL şemaları, migration'lar ve seed verileri
    ├── 📄 README.md                   → Migration nasıl çalıştırılır, seed adımları
    ├── 📁 prisma/
    │   ├── 📄 schema.prisma           → Tüm tablo tanımları: User, Team, Expense, Trip, Log, Plan vb.
    │   └── 📁 migrations/             → Prisma tarafından otomatik üretilen migration dosyaları
    │       └── 📄 migration_lock.toml
    └── 📁 seeds/
        ├── 📄 seed.ts                 → Tüm seed'leri sırayla çalıştıran ana dosya
        ├── 📄 plans.seed.ts           → Plan verilerini (Ücretsiz, Premium, Pro, Enterprise) ekler
        ├── 📄 roles.seed.ts           → Varsayılan rol şablonlarını (Admin, Mod, Member) ekler
        └── 📄 demo.seed.ts            → Geliştirme ortamı için örnek kullanıcı ve takım verisi
```

---

## Servis İletişim Mimarisi

```
İstemci (React)
    │
    ▼
api-gateway          ← Tek giriş noktası. Rate-limit, correlationId, yönlendirme
    │
    ├──► node-core-service   ← Auth, RBAC, Teams, Expenses, Trips, WS, Bildirimler
    │        │
    │        ├──► PostgreSQL  (Prisma ORM)
    │        └──► Redis       (Session cache, pub/sub, rate-limit store)
    │
    └──► python-ml-service   ← OCR, Finansal Analiz, Kategorizasyon
             │
             └──► PostgreSQL  (Yalnızca okuma — analiz için)
```

## RBAC Deny-List Mantığı

```
Her kullanıcının rolü (Admin / Moderator / Member) bir şablondan gelir.
Admin → deny list boş, her şeye erişir.
Moderator / Member → izin verilmeyen aksiyonlar deny listesine yazılır.

Kontrol akışı:
  rbac.ts middleware → kullanıcının teamId + rolünü alır
                     → o role ait deny listesini Redis'ten okur
                     → istenen permissionKey listede varsa 403 döner
                     → yoksa geçirir
```

## WebSocket Oda Yapısı

```
user:{userId}          ← Kişisel bildirimler (davet, profil değişikliği)
team:{teamId}          ← Takım geneli olaylar (yeni üye, ayar değişikliği)
team:{teamId}:admin    ← Sadece adminlere (yeni talep bildirimi)
team:{teamId}:requests ← Talep onay/red gerçek zamanlı güncellemeleri
```
