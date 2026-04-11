from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import epics as epics_crud
from app.crud import tasks as crud
from app.dependencies import get_current_user
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
