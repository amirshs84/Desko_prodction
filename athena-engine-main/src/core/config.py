from pathlib import Path

from pydantic import computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # Project Information
    APP_NAME: str = "Athena Engine"
    APP_VERSION: str = "1.0"
    API_V1_VERSION: str = "/api/v1"
    DEBUG: bool = False

    # Database Credentials
    POSTGRES_SERVER: str
    POSTGRES_PORT: int
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    # Database Pool Settings
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # JWT Validation
    JWT_ISSUER: str
    JWT_AUDIENCE: str
    JWT_ALGORITHM: str = "RS256"
    JWT_PUBLIC_KEY: str = ""
    JWT_PUBLIC_KEY_FILE: str | None = None
    JWT_LEEWAY_SECONDS: int = 10

    # CORS
    CORS_ALLOW_ORIGINS: list[str] = ["*"]

    @model_validator(mode="after")
    def load_jwt_public_key(self) -> "Settings":
        key = self.JWT_PUBLIC_KEY
        if self.JWT_PUBLIC_KEY_FILE:
            key = Path(self.JWT_PUBLIC_KEY_FILE).read_text(encoding="utf-8")
        if not str(key).strip():
            raise ValueError("JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_FILE is required")
        object.__setattr__(self, "JWT_PUBLIC_KEY", key)
        return self

    @computed_field
    @property
    def POSTGRES_URL_OBJECT(self) -> URL:
        return URL.create(
            "postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        )


settings = Settings()
