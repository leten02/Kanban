from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./kanban.db"
    secret_key: str = "dev-secret-key-change-in-production"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    gcs_pulse_token: str = ""
    gcs_pulse_base_url: str = "https://gcs-pulse.example.com"


settings = Settings()
