import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    INTERNAL_API_KEY: str = "flowtera-internal-secret"
    PORT: int = 8000
    NODE_SERVICE_URL: str = "http://localhost:3001"
    TESSERACT_CMD: str = ""            # Boşsa sistem PATH'ten bulunur
    DB_POOL_MIN: int = 2
    DB_POOL_MAX: int = 10

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
