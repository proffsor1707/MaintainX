from logging.config import fileConfig

from alembic import context

from app.core.config import get_settings
from app.database.base import Base
from app.database.session import get_engine
import app.models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def require_database_url() -> str:
    database_url = get_settings().database_url.strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set to run Alembic migrations.")
    return database_url


def run_migrations_offline() -> None:
    context.configure(
        url=require_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    database_url = require_database_url()
    connectable = get_engine()
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()