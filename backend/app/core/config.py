from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# The .env file lives in the repository root, while this module is backend/app/core/.
# Anchoring the path here means the settings load identically whether uvicorn is started
# from the repository root or from backend/.
ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Badi eSIM Support API"
    app_version: str = "1.0.0"
    database_url: str = Field(
        default="postgresql+psycopg://postgres:root@localhost:5432/badi_support",
        validation_alias="DATABASE_URL",
    )
    port: int = Field(default=8000, validation_alias="PORT")

    # Comma-separated, not JSON, so it stays a plain one-line .env value. Defaults cover
    # the Vite dev server on both of its usual hostnames.
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    # Demo mode (plan section 39): when true, GET /demo/users returns the seeded users
    # without authentication, so the UI can offer a "who am I" picker. When false, the
    # endpoint returns 404 and only the X-User-Id header works. Default true for a
    # turnkey demo; set DEMO_MODE=false in .env for anything beyond local development.
    demo_mode: bool = Field(default=True, validation_alias="DEMO_MODE")


settings = Settings()