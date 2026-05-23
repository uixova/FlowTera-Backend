from pydantic import BaseModel, HttpUrl

class OcrFromUrlRequest(BaseModel):
    url: str  # S3 presigned URL veya erişilebilir URL
