# ══════════════════════════════════════════════════════════════════
#  FlowTera — python-ml-service Dockerfile
#  Build context: python-ml-service/
# ══════════════════════════════════════════════════════════════════

# Aşama 1: Bağımlılıklar 
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# Aşama 2: Çalışma zamanı 
FROM python:3.11-slim AS runner

# Çalışma zamanı system kütüphaneleri
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Builder'dan kurulu paketleri kopyala
COPY --from=builder /install /usr/local

# Uygulama kaynak kodu
COPY app/ ./app/

# Sağlıklı olmayan container'ı yeniden başlat
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
