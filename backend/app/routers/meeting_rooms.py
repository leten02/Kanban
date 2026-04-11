import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decrypt
from app.dependencies import get_current_user
from app.models.user import User
from app.services.google_calendar import create_meeting_event

SCHOOL_API = settings.gcs_pulse_base_url

router = APIRouter(prefix="/api/meeting-rooms", tags=["meeting-rooms"])


def _school_headers() -> dict:
    if not settings.gcs_pulse_token:
        raise HTTPException(503, "1000school API 토큰이 서버에 설정되지 않았습니다.")
    return {"Authorization": f"Bearer {settings.gcs_pulse_token}"}


@router.get("")
async def list_rooms(current_user: User = Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SCHOOL_API}/meeting-rooms",
            headers=_school_headers(),
        )
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
            headers=_school_headers(),
        )
        r.raise_for_status()
        return r.json()


class CreateReservationBody(BaseModel):
    start_at: str
    end_at: str
    purpose: str | None = None
    attendee_emails: list[str] = []
    room_name: str | None = None
    room_location: str | None = None


@router.post("/{room_id}/reservations")
async def create_reservation(
    room_id: int,
    body: CreateReservationBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. 1000school 예약
    async with httpx.AsyncClient() as client:
        school_payload = {"start_at": body.start_at, "end_at": body.end_at}
        if body.purpose:
            school_payload["purpose"] = body.purpose
        r = await client.post(
            f"{SCHOOL_API}/meeting-rooms/{room_id}/reservations",
            json=school_payload,
            headers=_school_headers(),
        )
        if r.status_code == 409:
            raise HTTPException(409, "해당 시간에 이미 예약이 있습니다.")
        r.raise_for_status()
        result = r.json()

    # 2. Google Calendar 이벤트 생성 (non-fatal)
    if current_user.google_refresh_token:
        try:
            all_emails = list({current_user.email} | set(body.attendee_emails))
            room_label = body.room_name or f"회의실 {room_id}"
            location = f"{room_label} ({body.room_location})" if body.room_location else room_label
            title = f"[{room_label}] {body.purpose or '회의'}"
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: create_meeting_event(
                    refresh_token=decrypt(current_user.google_refresh_token),
                    title=title,
                    start_dt=body.start_at,
                    end_dt=body.end_at,
                    attendee_emails=all_emails,
                    description=body.purpose or "",
                    location=location,
                ),
            )
        except Exception:
            pass  # 캘린더 실패해도 1000school 예약은 성공으로 반환

    return result


@router.delete("/reservations/{reservation_id}")
async def delete_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
):
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{SCHOOL_API}/meeting-rooms/reservations/{reservation_id}",
            headers=_school_headers(),
        )
        if r.status_code == 403:
            raise HTTPException(403, "본인이 예약한 건만 취소할 수 있습니다.")
        r.raise_for_status()
        return {"ok": True}
