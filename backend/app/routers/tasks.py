from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import epics as epics_crud
from app.crud import tasks as crud
from app.dependencies import get_current_user
from app.models.task_comment import TaskComment
from app.models.user import User
from app.schemas.task import TaskCreate, TaskOut, TaskStatusUpdate, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
async def list_tasks(
    project_id: int,
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await crud.get_tasks(db, project_id, status)


@router.post("/epics/{epic_id}/tasks", response_model=TaskOut, status_code=201)
async def create_task(
    epic_id: int,
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    epic = await epics_crud.get_epic(db, epic_id)
    if epic is None:
        raise HTTPException(status_code=404, detail="Epic not found")
    return await crud.create_task(db, epic_id, epic.project_id, data, current_user.id)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return await crud.update_task(db, task, data)


@router.patch("/tasks/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: int,
    data: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return await crud.update_task_status(db, task, data.status)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await crud.delete_task(db, task)
    return Response(status_code=204)


# ── 댓글 ──────────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    task_id: int
    author_user_id: int | None
    author_name: str
    content: str
    created_at: str

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_obj(cls, obj: TaskComment) -> "CommentOut":
        return cls(
            id=obj.id,
            task_id=obj.task_id,
            author_user_id=obj.author_user_id,
            author_name=obj.author_name,
            content=obj.content,
            created_at=obj.created_at.isoformat() if obj.created_at else "",
        )


@router.get("/tasks/{task_id}/comments", response_model=list[CommentOut])
async def list_comments(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TaskComment)
        .where(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at)
    )
    return [CommentOut.from_orm_obj(c) for c in result.scalars().all()]


@router.post("/tasks/{task_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    task_id: int,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    comment = TaskComment(
        task_id=task_id,
        author_user_id=current_user.id,
        author_name=current_user.name or current_user.email,
        content=body.content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentOut.from_orm_obj(comment)


@router.delete("/tasks/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TaskComment).where(TaskComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.author_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 댓글만 삭제할 수 있습니다.")
    await db.delete(comment)
    await db.commit()
    return Response(status_code=204)
