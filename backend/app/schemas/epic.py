from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict


class EpicCreate(BaseModel):
    title: str
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class EpicUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    start_date: date | None = None
    end_date: date | None = None


class EpicOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    status: str
    start_date: date | None
    end_date: date | None
    progress: int
    model_config = ConfigDict(from_attributes=True)
