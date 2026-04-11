"""Tests for the /meeting-rooms API endpoints."""
import pytest
import respx
from httpx import Response

from app.core.config import settings

GCS_BASE = settings.gcs_pulse_base_url


@pytest.mark.asyncio
async def test_list_rooms(auth_client):
    ac, user = auth_client
    rooms_data = [
        {"id": 1, "name": "Room A", "location": "1F", "description": "Large"},
        {"id": 2, "name": "Room B", "location": "2F", "description": "Small"},
    ]
    with respx.mock:
        respx.get(f"{GCS_BASE}/meeting-rooms").mock(
            return_value=Response(200, json=rooms_data)
        )
        resp = await ac.get("/meeting-rooms")

    assert resp.status_code == 200
    assert resp.json() == rooms_data


@pytest.mark.asyncio
async def test_list_reservations(auth_client):
    ac, user = auth_client
    reservations_data = [
        {
            "id": 10,
            "start_at": "2026-04-16T10:00:00",
            "end_at": "2026-04-16T11:00:00",
            "reserved_by": "alice@example.com",
            "purpose": "Standup",
        }
    ]
    with respx.mock:
        respx.get(f"{GCS_BASE}/meeting-rooms/1/reservations").mock(
            return_value=Response(200, json=reservations_data)
        )
        resp = await ac.get("/meeting-rooms/1/reservations", params={"date": "2026-04-16"})

    assert resp.status_code == 200
    assert resp.json() == reservations_data


@pytest.mark.asyncio
async def test_book_room_without_calendar(auth_client, db_session):
    """Book a room without attendees — no Calendar call should be made."""
    ac, user = auth_client
    gcs_response = {
        "id": 42,
        "start_at": "2026-04-16T10:00:00",
        "end_at": "2026-04-16T11:00:00",
        "purpose": "Sprint Review",
    }
    with respx.mock:
        respx.post(f"{GCS_BASE}/meeting-rooms/1/reservations").mock(
            return_value=Response(201, json=gcs_response)
        )
        resp = await ac.post(
            "/meeting-rooms/1/reservations",
            json={
                "start_at": "2026-04-16T10:00:00",
                "end_at": "2026-04-16T11:00:00",
                "purpose": "Sprint Review",
            },
        )

    assert resp.status_code == 201
    data = resp.json()
    assert data["gcs_reservation_id"] == 42
    assert data["google_calendar_event_id"] is None
    assert data["attendee_emails"] == []
    assert "id" in data  # local DB id

    # Verify DB entry exists
    from sqlalchemy import select
    from app.models.meeting_reservation import MeetingReservation

    result = await db_session.execute(
        select(MeetingReservation).where(MeetingReservation.gcs_reservation_id == 42)
    )
    db_res = result.scalar_one_or_none()
    assert db_res is not None
    assert db_res.purpose == "Sprint Review"
    assert db_res.reserved_by_user_id == user.id


@pytest.mark.asyncio
async def test_cancel_reservation(auth_client, db_session):
    """Cancel a reservation: verify GCS-PULSE DELETE is called and DB entry removed."""
    ac, user = auth_client
    gcs_book_response = {
        "id": 99,
        "start_at": "2026-04-17T14:00:00",
        "end_at": "2026-04-17T15:00:00",
        "purpose": "Demo",
    }

    # First book a room to get a local reservation ID
    with respx.mock:
        respx.post(f"{GCS_BASE}/meeting-rooms/2/reservations").mock(
            return_value=Response(201, json=gcs_book_response)
        )
        book_resp = await ac.post(
            "/meeting-rooms/2/reservations",
            json={
                "start_at": "2026-04-17T14:00:00",
                "end_at": "2026-04-17T15:00:00",
                "purpose": "Demo",
            },
        )
    assert book_resp.status_code == 201
    local_id = book_resp.json()["id"]

    # Now cancel it
    with respx.mock:
        gcs_delete = respx.delete(
            f"{GCS_BASE}/meeting-rooms/reservations/99"
        ).mock(return_value=Response(204))
        cancel_resp = await ac.delete(f"/meeting-rooms/reservations/{local_id}")

    assert cancel_resp.status_code == 200
    assert cancel_resp.json() == {"message": "Reservation cancelled"}
    assert gcs_delete.called

    # DB entry should be gone
    from sqlalchemy import select
    from app.models.meeting_reservation import MeetingReservation

    result = await db_session.execute(
        select(MeetingReservation).where(MeetingReservation.id == local_id)
    )
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_cancel_reservation_not_found(auth_client):
    ac, user = auth_client
    resp = await ac.delete("/meeting-rooms/reservations/99999")
    assert resp.status_code == 404
