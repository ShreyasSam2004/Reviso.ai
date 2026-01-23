"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# Get absolute path to .env file in backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Reviso"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: Literal["development", "staging", "production"] = "development"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/edu_summarizer.db"

    # AI Providers
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    default_llm_provider: Literal["openai", "anthropic"] = "openai"
    default_model: str = "gpt-4o-mini"

    # Vector Store
    chroma_persist_directory: str = "./data/chroma"
    embedding_model: str = "all-MiniLM-L6-v2"

    # File Processing
    upload_directory: str = "./data/uploads"
    max_file_size_mb: int = 50
    allowed_extensions: set[str] = {".pdf"}

    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 200

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    # Authentication / JWT
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
