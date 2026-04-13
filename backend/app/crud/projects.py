from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate


async def get_projects(db: AsyncSession, user_id: int, user_email: str) -> list[Project]:
    member_subq = select(ProjectMember.project_id).where(ProjectMember.email == user_email)
    result = await db.execute(
        select(Project).where(
            or_(
                Project.created_by_user_id == user_id,
                Project.id.in_(member_subq),
            )
        )
    )
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
