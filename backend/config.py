"""Application settings, read from environment variables (and an optional .env file)."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

DEFAULT_DATABASE_URL = "postgresql://vrcm:vrcm@localhost:5432/vrcm"


def _as_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    cors_origins: list[str]
    seed_demo_data: bool


def get_settings() -> Settings:
    """Read settings on every call so tests can override them with environment variables."""
    origins = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    return Settings(
        database_url=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL),
        cors_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        seed_demo_data=_as_bool(os.getenv("SEED_DEMO_DATA", "true")),
    )
