from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.models.task_tag import TaskTag
from app.models.project_member import ProjectMember
from app.schemas.task import TaskCreate, TaskUpdate


async def _task_to_dict(db: AsyncSession, task: Task) -> dict:
    result = await db.execute(select(TaskTag.tag).where(TaskTag.task_id == task.id))
    tags = list(result.scalars().all())
    d = {col.name: getattr(task, col.name) for col in Task.__table__.columns}
    d["tags"] = tags
    return d


async def _set_tags(db: AsyncSession, task_id: int, tags: list[str]) -> None:
    await db.execute(delete(TaskTag).where(TaskTag.task_id == task_id))
    for tag in tags:
        tag = tag.strip()
        if tag:
            db.add(TaskTag(task_id=task_id, tag=tag))


async def _get_member_name(db: AsyncSession, member_id: int) -> str | None:
    result = await db.execute(
        select(ProjectMember.name).where(ProjectMember.id == member_id)
    )
    return result.scalar_one_or_none()


async def get_tasks(
    db: AsyncSession, project_id: int, status: str | None = None
) -> list[dict]:
    query = select(Task).where(Task.project_id == project_id)
    if status is not None:
        query = query.where(Task.status == status)
    result = await db.execute(query)
    tasks = list(result.scalars().all())
    if not tasks:
        return []
    # Batch-fetch all tags in one query (avoids N+1)
    task_ids = [t.id for t in tasks]
    tags_result = await db.execute(
        select(TaskTag.task_id, TaskTag.tag).where(TaskTag.task_id.in_(task_ids))
    )
    tags_by_task: dict[int, list[str]] = {}
    for task_id, tag in tags_result.all():
        tags_by_task.setdefault(task_id, []).append(tag)
    return [
        {
            **{col.name: getattr(t, col.name) for col in Task.__table__.columns},
            "tags": tags_by_task.get(t.id, []),
        }
        for t in tasks
    ]


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()


async def create_task(
    db: AsyncSession,
    project_id: int,
    data: TaskCreate,
    user_id: int,
    epic_id: int | None = None,
) -> dict:
    assignee_name = None
    if data.assignee_member_id is not None:
        assignee_name = await _get_member_name(db, data.assignee_member_id)

    task = Task(
        epic_id=epic_id,
        project_id=project_id,
        title=data.title,
        description=data.description,
        assignee_user_id=data.assignee_user_id,
        assignee_member_id=data.assignee_member_id,
        assignee_name=assignee_name,
        priority=data.priority,
        status=data.status,
        start_date=data.start_date,
        due_date=data.due_date,
        created_by_user_id=user_id,
    )
    db.add(task)
    await db.flush()
    await _set_tags(db, task.id, data.tags)
    await db.commit()
    await db.refresh(task)
    return await _task_to_dict(db, task)


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> dict:
    update_data = data.model_dump(exclude_unset=True)

    tags = update_data.pop("tags", None)

    if "assignee_member_id" in update_data:
        member_id = update_data["assignee_member_id"]
        if member_id is not None:
            update_data["assignee_name"] = await _get_member_name(db, member_id)
        else:
            update_data["assignee_name"] = None

    for field, value in update_data.items():
        setattr(task, field, value)

    if tags is not None:
        await _set_tags(db, task.id, tags)

    await db.commit()
    await db.refresh(task)
    return await _task_to_dict(db, task)


async def update_task_status(db: AsyncSession, task: Task, status: str) -> dict:
    task.status = status
    await db.commit()
    await db.refresh(task)
    return await _task_to_dict(db, task)


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.commit()
