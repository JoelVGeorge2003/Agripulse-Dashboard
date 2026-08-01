from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://agripulse:agripulse@localhost:5432/agripulse"
    chat_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout_seconds: float = 20.0
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    openai_base_url: str = "https://api.openai.com/v1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def asyncpg_url(self) -> str:
        return self.database_url.split("?", maxsplit=1)[0]


@lru_cache
def get_settings() -> Settings:
    return Settings()
