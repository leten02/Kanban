from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.crud import epics as crud
from app.crud import projects as projects_crud
from app.dependencies import get_current_user
from app.models.epic import Epic
from app.models.user import User
from app.schemas.epic import EpicCreate, EpicOut, EpicUpdate

router = APIRouter(tags=["epics"])


def _epic_out(epic: Epic, progress: int) -> EpicOut:
    return EpicOut(
        id=epic.id,
        project_id=epic.project_id,
        title=epic.title,
        description=epic.description,
        status=epic.status,
        start_date=epic.start_date,
        end_date=epic.end_date,
        progress=progress,
    )


@router.get("/projects/{project_id}/epics", response_model=list[EpicOut])
async def list_epics(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await projects_crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    epics = await crud.get_epics(db, project_id)
    result = []
    for epic in epics:
        progress = await crud.compute_epic_progress(db, epic.id)
        result.append(_epic_out(epic, progress))
    return result


@router.post("/projects/{project_id}/epics", response_model=EpicOut, status_code=201)
async def create_epic(
    project_id: int,
    data: EpicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await projects_crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    epic = await crud.create_epic(db, project_id, data, current_user.id)
    progress = await crud.compute_epic_progress(db, epic.id)
    return _epic_out(epic, progress)


@router.patch("/epics/{epic_id}", response_model=EpicOut)
async def update_epic(
    epic_id: int,
    data: EpicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    epic = await crud.get_epic(db, epic_id)
    if epic is None:
        raise HTTPException(status_code=404, detail="Epic not found")
    epic = await crud.update_epic(db, epic, data)
    progress = await crud.compute_epic_progress(db, epic.id)
    return _epic_out(epic, progress)


@router.delete("/epics/{epic_id}", status_code=204)
async def delete_epic(
    epic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    epic = await crud.get_epic(db, epic_id)
    if epic is None:
        raise HTTPException(status_code=404, detail="Epic not found")
    await crud.delete_epic(db, epic)
    return Response(status_code=204)
