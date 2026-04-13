"""Shared fixtures for API (backend) tests."""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db
from app.models import Base
from app.models.user import User


TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    """AsyncClient wired to the FastAPI app with in-memory SQLite."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(db_session):
    """AsyncClient with a pre-seeded test user and session cookie."""
    # Seed a test user
    user = User(
        google_id="test-google-id",
        email="test@example.com",
        name="Test User",
        picture=None,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Inject signed session cookie
        from app.dependencies import make_session_cookie
        ac.cookies.set("session_user_id", make_session_cookie(user.id))
        yield ac, user

    app.dependency_overrides.clear()
