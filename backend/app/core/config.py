"""Application configuration and environment management."""

from functools import lru_cache

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = Field(default="TutorConnect")
    app_env: str = Field(default="development")
    database_url: str = Field(validation_alias="DATABASE_URL")
    jwt_secret: str = Field(min_length=16, validation_alias="JWT_SECRET")
    jwt_expire_minutes: int = Field(default=60, validation_alias="JWT_EXPIRE_MINUTES")
    password_hash_scheme: str = Field(default="bcrypt", validation_alias="PASSWORD_HASH_SCHEME")
    allowed_origins: list[str] = Field(default_factory=list, validation_alias="ALLOWED_ORIGINS")
    analytics_dashboard_url: HttpUrl | None = Field(default=None, validation_alias="ANALYTICS_DASHBOARD_URL")
    uploads_dir: str = Field(default="uploads", validation_alias="UPLOADS_DIR")
    smtp_host: str | None = Field(default=None, validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_user: str | None = Field(default=None, validation_alias="SMTP_USER")
    smtp_password: str | None = Field(default=None, validation_alias="SMTP_PASSWORD")
    smtp_from: str | None = Field(default=None, validation_alias="SMTP_FROM")
    smtp_tls: bool = Field(default=True, validation_alias="SMTP_TLS")
    smtp_ssl: bool = Field(default=False, validation_alias="SMTP_SSL")
    public_base_url: HttpUrl | None = Field(default=None, validation_alias="PUBLIC_BASE_URL")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
