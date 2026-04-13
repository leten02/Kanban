from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user, require_project_member
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentOut, DocumentUpdate

router = APIRouter(tags=["documents"])


@router.get("/projects/{project_id}/documents", response_model=list[DocumentOut])
async def list_documents(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_member(project_id, current_user, db)
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id)
        .order_by(Document.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/documents", response_model=DocumentOut, status_code=201)
async def create_document(
    project_id: int,
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_project_member(project_id, current_user, db)
    doc = Document(project_id=project_id, title=data.title, content=data.content)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.patch("/documents/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: int,
    data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "문서를 찾을 수 없습니다.")
    await require_project_member(doc.project_id, current_user, db)
    if data.title is not None:
        doc.title = data.title
    if data.content is not None:
        doc.content = data.content
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "문서를 찾을 수 없습니다.")
    await require_project_member(doc.project_id, current_user, db)
    await db.delete(doc)
    await db.commit()
