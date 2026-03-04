from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./dreamcatcher.db"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    openai_api_key: str = "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"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
