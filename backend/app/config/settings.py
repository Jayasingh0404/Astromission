from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ASTROMISSION — Junior Astronaut Mission Trainer"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "astromission-nasa-space-apps-2026-dev-secret-key-change-in-prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Supports PostgreSQL (postgresql+psycopg2://...) and SQLite fallback for local run/tests
    DATABASE_URL: str = "sqlite:///./astromission.db"

    CORS_ORIGINS: str = "https://jayasingh0404.github.io,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    AI_PROVIDER: str = "knowledge_engine"
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-2.5-flash"
    AI_TIMEOUT_SECONDS: int = 15
    AI_RATE_LIMIT_PER_MINUTE: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

