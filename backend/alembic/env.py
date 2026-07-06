import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context
from app.core.config import settings
from app.core.database import Base
from app.models.models import User, Conversation, Document, TokenUsage

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    # Ignore tables not managed by our SQLAlchemy models (e.g. pgvector's own tables)
    if type_ == "table" and name in ("store", "store_vectors"):
        return False
    return True


def run_migrations_offline():
    context.configure(
        url=settings.db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    connectable = create_async_engine(settings.db_url)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())