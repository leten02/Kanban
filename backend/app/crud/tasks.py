from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


async def get_tasks(
    db: AsyncSession, project_id: int, status: str | None = None
) -> list[Task]:
    query = select(Task).where(Task.project_id == project_id)
    if status is not None:
        query = query.where(Task.status == status)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()


async def create_task(
    db: AsyncSession,
    epic_id: int,
    project_id: int,
    data: TaskCreate,
    user_id: int,
) -> Task:
    task = Task(
        epic_id=epic_id,
        project_id=project_id,
        title=data.title,
        description=data.description,
        assignee_user_id=data.assignee_user_id,
        priority=data.priority,
        due_date=data.due_date,
        created_by_user_id=user_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task_status(db: AsyncSession, task: Task, status: str) -> Task:
    task.status = status
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()
