from contextlib import asynccontextmanager
from typing import AsyncIterator
from urllib.parse import unquote, urlsplit
import asyncpg
from .config import get_settings


_pool: asyncpg.Pool | None = None


async def connect_database() -> None:
    global _pool
    if _pool is None:
        parsed = urlsplit(get_settings().asyncpg_url.strip().strip("\"'"))
        if not parsed.hostname or not parsed.username or not parsed.password:
            raise RuntimeError("DATABASE_URL must be a complete PostgreSQL connection URI.")
        _pool = await asyncpg.create_pool(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=unquote(parsed.username),
            password=unquote(parsed.password),
            database=parsed.path.lstrip("/") or "postgres",
            ssl="require",
            min_size=1,
            max_size=6,
        )


async def disconnect_database() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def connection() -> AsyncIterator[asyncpg.Connection]:
    if _pool is None:
        await connect_database()
    assert _pool is not None
    async with _pool.acquire() as db_connection:
        yield db_connection
