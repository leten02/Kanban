from pydantic import BaseModel, ConfigDict


class SubtaskCreate(BaseModel):
    title: str
    assignee_user_id: int | None = None


class SubtaskUpdate(BaseModel):
    title: str | None = None
    assignee_user_id: int | None = None
    is_completed: bool | None = None


class SubtaskOut(BaseModel):
    id: int
    task_id: int
    title: str
    is_completed: bool
    assignee_user_id: int | None
    task_progress: int | None = None
    model_config = ConfigDict(from_attributes=True)
