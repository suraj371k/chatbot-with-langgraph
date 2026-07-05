from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    groq_key: str = Field(validation_alias="GROQ_API_KEY")
    db_url: str = Field(validation_alias="DATABASE_URL")
    db_url_psycopg: str = Field(validation_alias='DATABASE_URL_PSYCOPG')
    secret_key: str = Field(validation_alias="SECRET_KEY")
    algorithm: str = Field(validation_alias="ALGORITHM")
    access_token_expiry_time: int = Field(default=10080, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")

settings = Settings()
