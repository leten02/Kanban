from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Railway provides postgresql:// — convert to asyncpg dialect
_url = settings.database_url
if _url.startswith("postgresql://") or _url.startswith("postgres://"):
    _url = _url.replace("postgresql://", "postgresql+asyncpg://", 1)
    _url = _url.replace("postgres://", "postgresql+asyncpg://", 1)
    _engine_kwargs = {}
elif _url.startswith("sqlite"):
    _engine_kwargs = {"connect_args": {"check_same_thread": False}}
else:
    _engine_kwargs = {}

engine = create_async_engine(_url, echo=False, **_engine_kwargs)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
