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
    bucket_access_key: str = Field(validation_alias="BUCKET_ACCESS_KEY")
    bucket_secret_key: str = Field(validation_alias="BUCKET_SECRET_KEY")
    bucket_endpoint: str = Field(validation_alias="BUCKET_ENDPOINT")
    bucket_name: str = Field(validation_alias="BUCKET_NAME")
    bucket_region: str = Field(validation_alias="BUCKET_REGION")
    pinecone_key: str = Field(validation_alias="PINECONE_API_KEY")
    pinecone_index_name: str = Field(validation_alias="PINECONE_INDEX_NAME")
    pinecone_region: str = Field(validation_alias="PINECONE_REGION")
    pinecone_cloud: str = Field(validation_alias='PINECONE_CLOUD')
    pinecone_host: str = Field(validation_alias="PINECONE_HOST")

    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    frontend_url: str = Field(validation_alias="FRONTEND_URL")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        return self.is_production

    @property
    def cookie_samesite(self) -> str:
        return "none" if self.is_production else "lax"

settings = Settings()
