from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL:     str = ""
    INTERNAL_API_KEY: str = "flowtera-internal-secret"
    PORT:             int = 8000
    NODE_SERVICE_URL: str = "http://localhost:3001"

    # OCR AI providers — at least one must be set
    GEMINI_API_KEY:       str = ""                   # Primary:  Google Gemini
    GEMINI_MODEL:         str = "gemini-2.5-flash-lite"   # Primary model
    GEMINI_FALLBACK_MODEL: str = "gemini-3.1-flash-lite"  # Fallback if primary quota exhausted
    OPENAI_API_KEY:       str = ""                   # Fallback: OpenAI (optional)
    OPENAI_MODEL:         str = "gpt-4o-mini"        # Override with any OpenAI model

    DB_POOL_MIN: int = 2
    DB_POOL_MAX: int = 10

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
