from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    debug: bool = False
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_v1_prefix: str = "/api"

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # Security & Auth
    jwt_secret_key: str = "jalrakshak-super-secret-key-32-chars-minimum-prod-change"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    admin_username: str = "admin"
    admin_password: str = "admin123"

    # Rate limiting
    default_rate_limit: str = "60/minute"

    # DB & Cache
    database_url: str = "sqlite+aiosqlite:///./jalrakshak.db"
    redis_url: str = "redis://localhost:6379/0"

    # Verified Public API Endpoints
    open_meteo_weather_url: str = "https://api.open-meteo.com/v1/forecast"
    open_meteo_elevation_url: str = "https://api.open-meteo.com/v1/elevation"
    open_meteo_archive_url: str = "https://archive-api.open-meteo.com/v1/archive"
    open_meteo_flood_url: str = "https://flood-api.open-meteo.com/v1/flood"
    usgs_earthquake_url: str = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    cisa_kev_url: str = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
    nasa_eonet_url: str = "https://eonet.gsfc.nasa.gov/api/v3/events"

    # Alerting
    apprise_targets: Optional[str] = None

    # AI / LLM
    gemini_api_key: Optional[str] = None

    def get_cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
