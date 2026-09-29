from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./rrp.db")

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate(conn)


async def _migrate(conn):
    """Add any columns that exist in the model but are missing from the DB (SQLite-safe)."""
    # Columns added after initial schema creation
    migrations = [
        ("programs", "market",      "VARCHAR(500)"),
        ("programs", "tasks_text",  "TEXT"),
        ("programs", "issues_text", "TEXT"),
        ("programs", "launch_date_display", "VARCHAR(200)"),
        ("programs", "date_reported",       "VARCHAR(100)"),
        ("programs", "requestor",           "VARCHAR(200)"),
        ("programs", "risks_and_deps",      "TEXT"),
    ]
    for table, column, col_type in migrations:
        rows = await conn.execute(_sa_text(f"PRAGMA table_info({table})"))
        existing = {r[1] for r in rows.fetchall()}
        if column not in existing:
            await conn.execute(_sa_text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))


from sqlalchemy import text as _sa_text
