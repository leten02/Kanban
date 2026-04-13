import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.models import user, project, epic, task, subtask, meeting_reservation, project_member, task_tag, task_comment, document  # noqa: F401
from app.routers import auth, projects, epics, tasks, subtasks, teams, meeting_rooms, documents
from app.routers import project_members

logger = logging.getLogger(__name__)

_DEV_SECRET = "dev-secret-key-change-in-production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 프로덕션 환경에서 기본 SECRET_KEY 사용 시 경고
    is_postgres = settings.database_url.startswith(("postgresql", "postgres"))
    if is_postgres and settings.secret_key == _DEV_SECRET:
        logger.critical(
            "⚠️  SECRET_KEY is set to the default dev value in a production environment. "
            "Set SECRET_KEY to a random secret (openssl rand -hex 32) immediately."
        )
        raise RuntimeError("SECRET_KEY must be changed before running in production.")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # 스키마 마이그레이션: epic_id NOT NULL → nullable (create_all은 기존 컬럼 변경 안 함)
        is_pg = settings.database_url.startswith(("postgresql", "postgres"))
        if is_pg:
            # 이미 nullable이면 에러 없이 넘어가도록 처리
            from sqlalchemy import text
            await conn.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='tasks' AND column_name='epic_id' AND is_nullable='NO'
                    ) THEN
                        ALTER TABLE tasks ALTER COLUMN epic_id DROP NOT NULL;
                    END IF;
                END $$;
            """))
    yield


app = FastAPI(title="Kanban API", lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
if settings.frontend_url:
    _allowed_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(epics.router)
app.include_router(tasks.router)
app.include_router(subtasks.router)
app.include_router(teams.router)
app.include_router(meeting_rooms.router)
app.include_router(project_members.router)
app.include_router(documents.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

