from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subtask import Subtask
from app.schemas.subtask import SubtaskCreate, SubtaskUpdate


async def get_subtasks(db: AsyncSession, task_id: int) -> list[Subtask]:
    result = await db.execute(select(Subtask).where(Subtask.task_id == task_id))
    return list(result.scalars().all())


async def get_subtask(db: AsyncSession, subtask_id: int) -> Subtask | None:
    result = await db.execute(select(Subtask).where(Subtask.id == subtask_id))
    return result.scalar_one_or_none()


async def create_subtask(
    db: AsyncSession, task_id: int, data: SubtaskCreate, user_id: int
) -> Subtask:
    subtask = Subtask(
        task_id=task_id,
        title=data.title,
        assignee_user_id=data.assignee_user_id,
        created_by_user_id=user_id,
    )
    db.add(subtask)
    await db.commit()
    await db.refresh(subtask)
    return subtask


async def update_subtask(db: AsyncSession, subtask: Subtask, data: SubtaskUpdate) -> Subtask:
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)
    await db.commit()
    await db.refresh(subtask)
    return subtask


async def delete_subtask(db: AsyncSession, subtask: Subtask) -> None:
    await db.delete(subtask)
    await db.commit()


async def compute_task_progress(db: AsyncSession, task_id: int) -> int:
    total_result = await db.execute(
        select(func.count()).where(Subtask.task_id == task_id)
    )
    total = total_result.scalar_one()
    if total == 0:
        return 0

    done_result = await db.execute(
        select(func.count()).where(
            Subtask.task_id == task_id, Subtask.is_completed == True  # noqa: E712
        )
    )
    done = done_result.scalar_one()
    return int(done / total * 100)
