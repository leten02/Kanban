"""E2E Journey 5: Meeting room reservation.

room list → reservations (date query param) → book (+Calendar message) → cancel (confirmed/aborted)

Verifies:
  - GET /meeting-rooms
  - GET /meeting-rooms/{id}/reservations?date=YYYY-MM-DD
  - POST /meeting-rooms/{id}/reservations with ISO datetime payload
  - DELETE /meeting-rooms/reservations/{id}
  - Calendar invite message when google_calendar_event_id is present
"""
from __future__ import annotations

import json

import httpx

from kanban.cli.main import app


def test_room_list(cli_runner, api):
    api.get("http://localhost:8000/meeting-rooms").mock(
        return_value=httpx.Response(200, json=[
            {"id": 1, "name": "Seminar A", "location": "Building 2", "description": "Large room"},
        ])
    )
    result = cli_runner.invoke(app, ["room", "list"])
    assert result.exit_code == 0
    assert "Seminar A" in result.output
    assert "Building 2" in result.output


def test_room_reservations_sends_date_query_param(cli_runner, api):
    route = api.get("http://localhost:8000/meeting-rooms/1/reservations").mock(
        return_value=httpx.Response(200, json=[
            {"start_at": "09:00", "end_at": "10:00", "reserved_by": "Alice", "purpose": "Sprint review"}
        ])
    )
    result = cli_runner.invoke(app, ["room", "reservations", "1", "2026-04-15"])
    assert result.exit_code == 0
    assert route.calls[0].request.url.params.get("date") == "2026-04-15"
    assert "Sprint review" in result.output


def test_room_book_shows_calendar_message(cli_runner, api):
    route = api.post("http://localhost:8000/meeting-rooms/1/reservations").mock(
        return_value=httpx.Response(201, json={
            "id": 12,
            "google_calendar_event_id": "gcal-xyz",
            "attendee_emails": ["a@test.com", "b@test.com"],
        })
    )
    result = cli_runner.invoke(app, [
        "room", "book", "1",
        "--date", "2026-04-15",
        "--start", "09:00",
        "--end", "10:00",
        "--purpose", "Sprint review",
    ])
    assert result.exit_code == 0, result.output
    assert "Reservation ID: 12" in result.output
    assert "Google Calendar" in result.output

    body = json.loads(route.calls[0].request.content)
    assert body["start_at"] == "2026-04-15T09:00:00"
    assert body["end_at"] == "2026-04-15T10:00:00"
    assert body["purpose"] == "Sprint review"


def test_room_book_no_calendar_when_no_event_id(cli_runner, api):
    """If server doesn't return a google_calendar_event_id, no Calendar message."""
    api.post("http://localhost:8000/meeting-rooms/1/reservations").mock(
        return_value=httpx.Response(201, json={"id": 13})
    )
    result = cli_runner.invoke(app, [
        "room", "book", "1",
        "--date", "2026-04-15",
        "--start", "14:00",
        "--end", "15:00",
    ])
    assert result.exit_code == 0, result.output
    assert "Reservation ID: 13" in result.output
    assert "Google Calendar" not in result.output


def test_room_cancel_confirmed(cli_runner, api):
    cancel_route = api.delete("http://localhost:8000/meeting-rooms/reservations/12").mock(
        return_value=httpx.Response(204)
    )
    result = cli_runner.invoke(app, ["room", "cancel", "12"], input="y\n")
    assert result.exit_code == 0, result.output
    assert "cancelled" in result.output.lower()
    assert cancel_route.called


def test_room_cancel_aborted(cli_runner, api):
    cancel_route = api.delete("http://localhost:8000/meeting-rooms/reservations/12").mock(
        return_value=httpx.Response(204)
    )
    result = cli_runner.invoke(app, ["room", "cancel", "12"], input="N\n")
    assert result.exit_code == 0
    assert not cancel_route.called
