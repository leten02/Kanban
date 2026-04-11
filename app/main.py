from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.database import engine
from app.models import Base
from app.models import user, project, epic, task, subtask, meeting_reservation  # noqa: F401
from app.routers import auth, projects, epics, tasks, subtasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Kanban API", lifespan=lifespan)
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(epics.router)
app.include_router(tasks.router)
app.include_router(subtasks.router)
