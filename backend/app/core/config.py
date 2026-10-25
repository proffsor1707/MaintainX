from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    frontend_origins: str = ""
    database_url: str = ""
    model_artifact_path: str = "ml/models/inference_pipeline.joblib"
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""

    @property
    def frontend_origins_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()