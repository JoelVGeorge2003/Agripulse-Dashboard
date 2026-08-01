from contextlib import asynccontextmanager
from typing import AsyncIterator
import asyncpg
from .config import get_settings


_pool: asyncpg.Pool | None = None


async def connect_database() -> None:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(get_settings().asyncpg_url, min_size=1, max_size=6)


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
