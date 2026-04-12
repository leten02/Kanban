from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_tag import TaskTag
from app.models.project import Project
from app.models.user import User

router = APIRouter(prefix="/api/projects", tags=["project-members"])


class ProjectMemberOut(BaseModel):
    id: int
    project_id: int
    school_user_id: int
    name: str
    email: str
    picture: Optional[str]
    role: str

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: str


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
async def list_members(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id)
    )
    return list(result.scalars().all())


@router.post("/{project_id}/members/sync", response_model=list[ProjectMemberOut])
async def sync_members(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.security import decrypt
    _raw = current_user.school_api_token
    if _raw:
        try:
            token = decrypt(_raw)
        except Exception:
            # 기존 평문 저장 데이터 호환 (마이그레이션 경로)
            token = _raw
    else:
        token = settings.gcs_pulse_token
    if not token:
        raise HTTPException(status_code=400, detail="No school API token available")

    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(
                f"{settings.gcs_pulse_base_url}/teams/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"School API error: {e.response.status_code}")
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Cannot reach school API")

    data = r.json()
    team = data.get("team")
    if not team:
        raise HTTPException(status_code=404, detail="No team found")

    members_data = team.get("members", [])
    synced = []
    for m in members_data:
        result = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.school_user_id == m["id"],
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = m["name"]
            existing.email = m["email"]
            existing.picture = m.get("picture")
            synced.append(existing)
        else:
            member = ProjectMember(
                project_id=project_id,
                school_user_id=m["id"],
                name=m["name"],
                email=m["email"],
                picture=m.get("picture"),
                role="member",
            )
            db.add(member)
            synced.append(member)

    await db.commit()
    for m in synced:
        await db.refresh(m)
    return synced


@router.patch("/{project_id}/members/{member_id}", response_model=ProjectMemberOut)
async def update_member_role(
    project_id: int,
    member_id: int,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = data.role
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{project_id}/members/{member_id}", status_code=204)
async def remove_member(
    project_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.id == member_id,
            ProjectMember.project_id == project_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    await db.delete(member)
    await db.commit()
    return Response(status_code=204)


@router.get("/{project_id}/assignee-suggestions", response_model=list[ProjectMemberOut])
async def assignee_suggestions(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Return members ordered by how many tasks they've been assigned in this project
    count_col = func.count(Task.id).label("assignment_count")
    result = await db.execute(
        select(ProjectMember, count_col)
        .outerjoin(
            Task,
            (Task.assignee_member_id == ProjectMember.id)
            & (Task.project_id == project_id),
        )
        .where(ProjectMember.project_id == project_id)
        .group_by(ProjectMember.id)
        .order_by(count_col.desc(), ProjectMember.name)
    )
    rows = result.all()
    return [row[0] for row in rows]


@router.get("/{project_id}/tags", response_model=list[str])
async def project_tags(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count_col = func.count(TaskTag.id).label("cnt")
    result = await db.execute(
        select(TaskTag.tag, count_col)
        .join(Task, Task.id == TaskTag.task_id)
        .where(Task.project_id == project_id)
        .group_by(TaskTag.tag)
        .order_by(count_col.desc())
    )
    return [row[0] for row in result.all()]
