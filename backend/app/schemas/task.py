from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    assignee_user_id: int | None = None
    assignee_member_id: int | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    start_date: date | None = None
    due_date: date | None = None
    tags: list[str] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_user_id: int | None = None
    assignee_member_id: int | None = None
    priority: Literal["low", "medium", "high"] | None = None
    start_date: date | None = None
    due_date: date | None = None
    tags: list[str] | None = None


class TaskStatusUpdate(BaseModel):
    status: Literal["todo", "in_progress", "in_review", "done"]


class TaskOut(BaseModel):
    id: int
    epic_id: int
    project_id: int
    title: str
    description: str | None
    status: str
    priority: str
    assignee_user_id: int | None
    assignee_member_id: int | None = None
    assignee_name: str | None = None
    start_date: date | None = None
    due_date: date | None
    tags: list[str] = []
    model_config = ConfigDict(from_attributes=True)
