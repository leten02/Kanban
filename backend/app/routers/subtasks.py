from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import subtasks as crud
from app.crud import tasks as tasks_crud
from app.dependencies import get_current_user, require_project_member
from app.models.user import User
from app.schemas.subtask import SubtaskCreate, SubtaskOut, SubtaskUpdate

router = APIRouter(tags=["subtasks"])


@router.get("/tasks/{task_id}/subtasks", response_model=list[SubtaskOut])
async def list_subtasks(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await tasks_crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await require_project_member(task.project_id, current_user, db)
    return await crud.get_subtasks(db, task_id)


@router.post("/tasks/{task_id}/subtasks", response_model=SubtaskOut, status_code=201)
async def create_subtask(
    task_id: int,
    data: SubtaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = await tasks_crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await require_project_member(task.project_id, current_user, db)
    return await crud.create_subtask(db, task_id, data, current_user.id)


@router.patch("/subtasks/{subtask_id}", response_model=SubtaskOut)
async def update_subtask(
    subtask_id: int,
    data: SubtaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = await crud.get_subtask(db, subtask_id)
    if subtask is None:
        raise HTTPException(status_code=404, detail="Subtask not found")
    task = await tasks_crud.get_task(db, subtask.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await require_project_member(task.project_id, current_user, db)
    subtask = await crud.update_subtask(db, subtask, data)
    out = SubtaskOut.model_validate(subtask)
    if data.is_completed is not None:
        out.task_progress = await crud.compute_task_progress(db, subtask.task_id)
    return out


@router.delete("/subtasks/{subtask_id}", status_code=204)
async def delete_subtask(
    subtask_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = await crud.get_subtask(db, subtask_id)
    if subtask is None:
        raise HTTPException(status_code=404, detail="Subtask not found")
    task = await tasks_crud.get_task(db, subtask.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    await require_project_member(task.project_id, current_user, db)
    await crud.delete_subtask(db, subtask)
    return Response(status_code=204)
