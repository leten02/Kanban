import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

SCHOOL_API = "https://api.1000.school"

router = APIRouter(prefix="/api/meeting-rooms", tags=["meeting-rooms"])


def _school_headers(user: User) -> dict:
    if not user.school_api_token:
        raise HTTPException(402, "1000school 계정 연동이 필요합니다")
    return {"Authorization": f"Bearer {user.school_api_token}"}


@router.get("")
async def list_rooms(current_user: User = Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SCHOOL_API}/meeting-rooms",
            headers=_school_headers(current_user),
        )
        if r.status_code == 401:
            raise HTTPException(402, "1000school 토큰이 만료되었습니다. 재연동이 필요합니다.")
        r.raise_for_status()
        return r.json()


@router.get("/{room_id}/reservations")
async def list_reservations(
    room_id: int,
    date: str,
    current_user: User = Depends(get_current_user),
):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SCHOOL_API}/meeting-rooms/{room_id}/reservations",
            params={"date": date},
            headers=_school_headers(current_user),
        )
        if r.status_code == 401:
            raise HTTPException(402, "1000school 토큰이 만료되었습니다. 재연동이 필요합니다.")
        r.raise_for_status()
        return r.json()


class CreateReservationBody(BaseModel):
    start_at: str
    end_at: str
    purpose: str | None = None


@router.post("/{room_id}/reservations")
async def create_reservation(
    room_id: int,
    body: CreateReservationBody,
    current_user: User = Depends(get_current_user),
):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SCHOOL_API}/meeting-rooms/{room_id}/reservations",
            json=body.model_dump(exclude_none=True),
            headers=_school_headers(current_user),
        )
        if r.status_code == 401:
            raise HTTPException(402, "1000school 토큰이 만료되었습니다. 재연동이 필요합니다.")
        if r.status_code == 409:
            raise HTTPException(409, "해당 시간에 이미 예약이 있습니다.")
        r.raise_for_status()
        return r.json()


@router.delete("/reservations/{reservation_id}")
async def delete_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
):
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{SCHOOL_API}/meeting-rooms/reservations/{reservation_id}",
            headers=_school_headers(current_user),
        )
        if r.status_code == 401:
            raise HTTPException(402, "1000school 토큰이 만료되었습니다. 재연동이 필요합니다.")
        if r.status_code == 403:
            raise HTTPException(403, "본인이 예약한 건만 취소할 수 있습니다.")
        r.raise_for_status()
        return {"ok": True}
