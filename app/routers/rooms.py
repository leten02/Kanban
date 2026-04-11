from datetime import datetime
import json

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.meeting_reservation import MeetingReservation
from app.models.user import User
from app.services.calendar import create_calendar_event, delete_calendar_event

router = APIRouter(tags=["rooms"])


def _gcs_headers() -> dict:
    return {"Authorization": f"Bearer {settings.gcs_pulse_token}"}


@router.get("/meeting-rooms")
async def list_rooms(current_user: User = Depends(get_current_user)):
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{settings.gcs_pulse_base_url}/meeting-rooms",
            headers=_gcs_headers(),
            timeout=10,
        )
        r.raise_for_status()
        return r.json()


@router.get("/meeting-rooms/{room_id}/reservations")
async def list_reservations(
    room_id: int,
    date: str = Query(..., description="YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
):
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{settings.gcs_pulse_base_url}/meeting-rooms/{room_id}/reservations",
            params={"date": date},
            headers=_gcs_headers(),
            timeout=10,
        )
        r.raise_for_status()
        return r.json()


@router.post("/meeting-rooms/{room_id}/reservations", status_code=201)
async def book_room(
    room_id: int,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_at: str = payload.get("start_at")
    end_at: str = payload.get("end_at")
    purpose: str = payload.get("purpose", "회의")
    attendee_emails: list[str] = payload.get("attendee_emails", [])

    # 1. Create GCS-PULSE reservation
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{settings.gcs_pulse_base_url}/meeting-rooms/{room_id}/reservations",
            json={"start_at": start_at, "end_at": end_at, "purpose": purpose},
            headers=_gcs_headers(),
            timeout=10,
        )
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        gcs_reservation = r.json()

    # 2. Create Google Calendar event (only when user has a token and attendees are provided)
    calendar_event_id = None
    if current_user.google_refresh_token and attendee_emails:
        try:
            calendar_event_id = await create_calendar_event(
                encrypted_refresh_token=current_user.google_refresh_token,
                summary=purpose or "회의실 예약",
                start_at=start_at,
                end_at=end_at,
                attendee_emails=attendee_emails,
                description=f"GCS-PULSE 회의실 예약 ID: {gcs_reservation['id']}",
            )
        except Exception as e:
            print(f"[Calendar] Failed to create event: {e}")

    # 3. Store in local DB (parse ISO strings to datetime for the DateTime columns)
    start_dt = datetime.fromisoformat(start_at)
    end_dt = datetime.fromisoformat(end_at)

    reservation = MeetingReservation(
        gcs_reservation_id=gcs_reservation["id"],
        gcs_room_id=room_id,
        reserved_by_user_id=current_user.id,
        start_at=start_dt,
        end_at=end_dt,
        purpose=purpose,
        attendee_emails=json.dumps(attendee_emails) if attendee_emails else None,
        google_calendar_event_id=calendar_event_id,
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)

    return {
        **gcs_reservation,
        "id": reservation.id,
        "gcs_reservation_id": gcs_reservation["id"],
        "google_calendar_event_id": calendar_event_id,
        "attendee_emails": attendee_emails,
    }


@router.delete("/meeting-rooms/reservations/{reservation_id}")
async def cancel_reservation(
    reservation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MeetingReservation).where(MeetingReservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # 1. Cancel GCS-PULSE reservation (404 = already gone, that's fine)
    async with httpx.AsyncClient() as c:
        await c.delete(
            f"{settings.gcs_pulse_base_url}/meeting-rooms/reservations/{reservation.gcs_reservation_id}",
            headers=_gcs_headers(),
            timeout=10,
        )

    # 2. Delete Google Calendar event
    if reservation.google_calendar_event_id and current_user.google_refresh_token:
        try:
            await delete_calendar_event(
                current_user.google_refresh_token,
                reservation.google_calendar_event_id,
            )
        except Exception as e:
            print(f"[Calendar] Failed to delete event: {e}")

    await db.delete(reservation)
    await db.commit()
    return {"message": "Reservation cancelled"}
