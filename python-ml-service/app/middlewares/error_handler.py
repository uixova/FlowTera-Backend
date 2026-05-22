import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    tb = traceback.format_exc()
    print(f"[ML-Service ERROR] {request.method} {request.url.path}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"status": "ERROR", "message": "ML servisinde beklenmeyen hata.", "detail": str(exc)},
    )
