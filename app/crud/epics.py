from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.epic import Epic
from app.models.task import Task
from app.schemas.epic import EpicCreate, EpicUpdate


async def get_epics(db: AsyncSession, project_id: int) -> list[Epic]:
    result = await db.execute(select(Epic).where(Epic.project_id == project_id))
    return list(result.scalars().all())


async def get_epic(db: AsyncSession, epic_id: int) -> Epic | None:
    result = await db.execute(select(Epic).where(Epic.id == epic_id))
    return result.scalar_one_or_none()


async def create_epic(
    db: AsyncSession, project_id: int, data: EpicCreate, user_id: int
) -> Epic:
    epic = Epic(
        project_id=project_id,
        title=data.title,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by_user_id=user_id,
    )
    db.add(epic)
    await db.commit()
    await db.refresh(epic)
    return epic


async def update_epic(db: AsyncSession, epic: Epic, data: EpicUpdate) -> Epic:
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(epic, field, value)
    await db.commit()
    await db.refresh(epic)
    return epic


async def delete_epic(db: AsyncSession, epic: Epic) -> None:
    await db.delete(epic)
    await db.commit()


async def compute_epic_progress(db: AsyncSession, epic_id: int) -> int:
    total_result = await db.execute(
        select(func.count()).where(Task.epic_id == epic_id)
    )
    total = total_result.scalar_one()
    if total == 0:
        return 0

    done_result = await db.execute(
        select(func.count()).where(Task.epic_id == epic_id, Task.status == "done")
    )
    done = done_result.scalar_one()
    return int(done / total * 100)
