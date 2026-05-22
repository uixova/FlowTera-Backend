from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

# İç servis API anahtarı doğrulayıcı
# Node-Core veya API Gateway'den gelen istekler X-Internal-API-Key header'ı taşımalı.
class InternalAuthMiddleware(BaseHTTPMiddleware):
    SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        key = request.headers.get("X-Internal-API-Key", "")
        if key != settings.INTERNAL_API_KEY:
            return JSONResponse(
                status_code=401,
                content={"status": "ERROR", "message": "Geçersiz iç servis anahtarı."},
            )

        return await call_next(request)
