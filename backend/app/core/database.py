import ssl
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from sqlalchemy.orm import DeclarativeBase

# Project root: app/core/database.py -> app/core -> app -> backend/
BASE_DIR = Path(__file__).resolve().parents[2]
CERT_PATH = BASE_DIR / "global-bundle.pem"

ssl_context = ssl.create_default_context(cafile=str(CERT_PATH))

engine = create_async_engine(
    settings.db_url,
    connect_args={"ssl": ssl_context},
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass
