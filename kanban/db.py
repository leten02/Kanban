"""Minimal async DB helpers for tests.

Note: create a fresh engine per call to avoid caching a connection bound to a different
KANBAN_DB_URL value across test runs (fixtures set KANBAN_DB_URL per test).
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os


def get_engine() -> AsyncEngine:
    """Return a new AsyncEngine configured from KANBAN_DB_URL each call."""
    url = os.environ.get("KANBAN_DB_URL", "sqlite+aiosqlite:///./kanban_test.db")
    return create_async_engine(url, echo=False)


def get_session():
    """Return an AsyncSession (not a context manager). Callers should use `async with`.

    This returns a new sessionmaker() instance bound to a freshly created engine.
    """
    engine = get_engine()
    Session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    return Session()


# Async context manager helper for convenience in tests
async def get_session_context():
    async with get_session() as s:
        yield s
