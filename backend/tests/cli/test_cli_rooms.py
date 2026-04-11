"""Tests for room commands: list, reservations, book, cancel."""
from unittest.mock import MagicMock

import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    config.set_token("test-tok")


ROOMS = [
    {"id": 1, "name": "Room A", "location": "Floor 3", "description": "8-person room"},
    {"id": 2, "name": "Phone Booth", "location": "Floor 2", "description": "1-person"},
]

RESERVATIONS = [
    {"start_at": "09:00", "end_at": "10:00", "reserved_by": "Jiyeon Park", "purpose": "Sprint planning"},
]


def _mock(monkeypatch, method, return_data):
    mc = MagicMock()
    mr = MagicMock(); mr.status_code = 200; mr.json.return_value = return_data
    getattr(mc, method).return_value = mr
    monkeypatch.setattr("kanban.cli.commands.rooms.get_client", lambda: mc)
    return mc


def test_room_list(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "get", ROOMS)
    runner = CliRunner()
    result = runner.invoke(app, ["room", "list"])
    assert result.exit_code == 0, result.output
    assert "Room A" in result.output
    assert "Phone Booth" in result.output
    mc.get.assert_called_once_with("/meeting-rooms")


def test_room_reservations(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "get", RESERVATIONS)
    runner = CliRunner()
    result = runner.invoke(app, ["room", "reservations", "1", "2026-04-15"])
    assert result.exit_code == 0, result.output
    mc.get.assert_called_once_with("/meeting-rooms/1/reservations", params={"date": "2026-04-15"})


def test_room_book(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "post", {"id": 12, "google_calendar_event_id": "gcal-evt-1", "attendee_emails": ["a@b.com", "c@d.com"]})
    runner = CliRunner()
    result = runner.invoke(app, [
        "room", "book", "1",
        "--date", "2026-04-16",
        "--start", "10:00",
        "--end", "11:00",
        "--purpose", "Weekly sync",
        "--attendees", "a@b.com,c@d.com",
    ])
    assert result.exit_code == 0, result.output
    assert "12" in result.output
    assert "2" in result.output  # 2 attendees
    mc.post.assert_called_once()


def test_room_cancel_confirmed(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    del_resp = MagicMock(); del_resp.status_code = 204
    mc.delete.return_value = del_resp
    monkeypatch.setattr("kanban.cli.commands.rooms.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["room", "cancel", "12"], input="y\n")
    assert result.exit_code == 0, result.output
    assert "cancelled" in result.output.lower()
    mc.delete.assert_called_once_with("/meeting-rooms/reservations/12")


def test_room_cancel_aborted(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    monkeypatch.setattr("kanban.cli.commands.rooms.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["room", "cancel", "12"], input="N\n")
    assert result.exit_code == 0
    mc.delete.assert_not_called()
