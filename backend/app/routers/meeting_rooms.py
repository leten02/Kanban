import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decrypt
from app.dependencies import get_current_user
from app.models.meeting_reservation import MeetingReservation
from app.models.user import User
from app.services.google_calendar import create_meeting_event

SCHOOL_API = settings.gcs_pulse_base_url

router = APIRouter(prefix="/api/meeting-rooms", tags=["meeting-rooms"])


def _server_headers() -> dict:
    """읽기 전용 작업(목록 조회)에 사용하는 서버 공용 토큰."""
    if not settings.gcs_pulse_token:
        raise HTTPException(503, "1000school API 토큰이 서버에 설정되지 않았습니다.")
    return {"Authorization": f"Bearer {settings.gcs_pulse_token}"}


def _user_headers(user: User) -> dict:
    """예약 생성·취소 등 본인 인증이 필요한 작업에 사용하는 사용자 토큰.
    개인 토큰이 없으면 서버 공용 토큰으로 폴백합니다."""
    if user.school_api_token:
        try:
            token = decrypt(user.school_api_token)
        except Exception:
            token = user.school_api_token  # 평문 저장 데이터 호환
        return {"Authorization": f"Bearer {token}"}
    if settings.gcs_pulse_token:
        return {"Authorization": f"Bearer {settings.gcs_pulse_token}"}
    raise HTTPException(503, "1000school 계정이 연결되지 않았습니다. 설정에서 계정을 연결해주세요.")


@router.get("")
async def list_rooms(current_user: User = Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SCHOOL_API}/meeting-rooms",
            headers=_server_headers(),
        )
        r.raise_for_status()
        return r.json()


@router.get("/my-reservations")
async def my_reservations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """현재 사용자의 오늘 이후 예약 목록 (로컬 DB 기반)."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(MeetingReservation)
        .where(
            MeetingReservation.reserved_by_user_id == current_user.id,
            MeetingReservation.end_at >= now,
        )
        .order_by(MeetingReservation.start_at)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.gcs_reservation_id,
            "meeting_room_id": r.gcs_room_id,
            "reserved_by_user_id": r.reserved_by_user_id,
            "reserved_by_name": current_user.name,
            "start_at": r.start_at.isoformat(),
            "end_at": r.end_at.isoformat(),
            "purpose": r.purpose,
            "can_cancel": True,
        }
        for r in rows
    ]


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
            headers=_server_headers(),
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
    # 1. 사용자 본인 토큰으로 1000school 예약
    async with httpx.AsyncClient() as client:
        school_payload = {"start_at": body.start_at, "end_at": body.end_at}
        if body.purpose:
            school_payload["purpose"] = body.purpose
        r = await client.post(
            f"{SCHOOL_API}/meeting-rooms/{room_id}/reservations",
            json=school_payload,
            headers=_user_headers(current_user),
        )
        if r.status_code == 409:
            raise HTTPException(409, "해당 시간에 이미 예약이 있습니다.")
        r.raise_for_status()
        result = r.json()

    # 2. 로컬 DB에 예약 저장 (my-reservations 조회용)
    try:
        local_res = MeetingReservation(
            gcs_reservation_id=result["id"],
            gcs_room_id=room_id,
            reserved_by_user_id=current_user.id,
            start_at=datetime.fromisoformat(body.start_at.replace("Z", "+00:00")),
            end_at=datetime.fromisoformat(body.end_at.replace("Z", "+00:00")),
            purpose=body.purpose,
            attendee_emails=json.dumps(body.attendee_emails) if body.attendee_emails else None,
        )
        db.add(local_res)
        await db.commit()
    except Exception as e:
        logger.warning("로컬 예약 저장 실패 (non-fatal): %s", e)

    # 3. Google Calendar 이벤트 생성 (non-fatal)
    if current_user.google_refresh_token:
        try:
            all_emails = list({current_user.email} | set(body.attendee_emails))
            room_label = body.room_name or f"회의실 {room_id}"
            location = f"{room_label} ({body.room_location})" if body.room_location else room_label
            title = f"[{room_label}] {body.purpose or '회의'}"
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
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
        except Exception as e:
            logger.warning("Google Calendar 이벤트 생성 실패 (non-fatal): %s", e)

    return result


@router.delete("/reservations/{reservation_id}")
async def delete_reservation(
    reservation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. 사용자 본인 토큰으로 1000school 취소
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{SCHOOL_API}/meeting-rooms/reservations/{reservation_id}",
            headers=_user_headers(current_user),
        )
        if r.status_code == 403:
            raise HTTPException(403, "본인이 예약한 건만 취소할 수 있습니다.")
        r.raise_for_status()

    # 2. 로컬 DB에서도 삭제
    res = await db.execute(
        select(MeetingReservation).where(
            MeetingReservation.gcs_reservation_id == reservation_id
        )
    )
    local = res.scalar_one_or_none()
    if local:
        await db.delete(local)
        await db.commit()

    return {"ok": True}
