from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


async def get_projects(db: AsyncSession) -> list[Project]:
    result = await db.execute(select(Project))
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: int) -> Project | None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    return result.scalar_one_or_none()


async def create_project(db: AsyncSession, data: ProjectCreate, user_id: int) -> Project:
    project = Project(
        name=data.name,
        description=data.description,
        created_by_user_id=user_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    await db.delete(project)
    await db.commit()
