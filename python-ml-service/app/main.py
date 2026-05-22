from contextlib import asynccontextmanager
import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middlewares.auth import InternalAuthMiddleware
from app.middlewares.error_handler import global_exception_handler
from app.config import settings
from app.routes import ocr, analysis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: DB bağlantı havuzu oluştur — her istek yeni bağlantı açmaz
    if settings.DATABASE_URL:
        db_url = settings.DATABASE_URL.replace("postgresql://", "postgres://")
        app.state.db_pool = await asyncpg.create_pool(
            db_url,
            min_size=settings.DB_POOL_MIN,
            max_size=settings.DB_POOL_MAX,
            command_timeout=30,
        )
    else:
        app.state.db_pool = None
    yield
    # Shutdown: havuzu kapat
    if app.state.db_pool:
        await app.state.db_pool.close()

app = FastAPI(
    title="FlowTera ML Service",
    description="OCR ve analiz işlemleri — sadece okuma yetkisi",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(InternalAuthMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(ocr.router,      prefix="/ml")
app.include_router(analysis.router, prefix="/ml")

@app.get("/health")
def health():
    return {"status": "OK", "service": "python-ml-service"}
