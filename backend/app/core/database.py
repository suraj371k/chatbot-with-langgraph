import ssl
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from sqlalchemy.orm import DeclarativeBase

ssl_context = ssl.create_default_context(
    cafile=str(Path("C:/Users/suraj/.postgresql/root.crt"))
)

engine = create_async_engine(
    settings.db_url,
    connect_args={"ssl": ssl_context},
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass
