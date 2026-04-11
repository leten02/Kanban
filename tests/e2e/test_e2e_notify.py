"""E2E Journey 6: Notifications.

notify list --limit 5 → read 45

Verifies:
  - GET /notifications?limit=5 — limit query param is forwarded
  - Read/unread label in table output
  - PATCH /notifications/45/read
"""
from __future__ import annotations

import httpx

from kanban.cli.main import app

_NOTIFICATIONS = [
    {"id": 45, "is_read": False, "message": "Task #10 assigned to you", "created_at": "2026-04-14T10:00:00"},
    {"id": 44, "is_read": True,  "message": "Epic 'MVP' is overdue",    "created_at": "2026-04-13T09:30:00"},
]


def test_notify_list_with_limit(cli_runner, api):
    route = api.get("http://localhost:8000/notifications").mock(
        return_value=httpx.Response(200, json=_NOTIFICATIONS)
    )
    result = cli_runner.invoke(app, ["notify", "list", "--limit", "5"])
    assert result.exit_code == 0, result.output
    assert "Task #10 assigned to you" in result.output

    # Verify limit query param was forwarded
    assert route.calls[0].request.url.params.get("limit") == "5"


def test_notify_list_shows_read_status(cli_runner, api):
    api.get("http://localhost:8000/notifications").mock(
        return_value=httpx.Response(200, json=_NOTIFICATIONS)
    )
    result = cli_runner.invoke(app, ["notify", "list"])
    assert result.exit_code == 0
    assert "No" in result.output   # unread notification
    assert "Yes" in result.output  # read notification


def test_notify_read_marks_as_read(cli_runner, api):
    route = api.patch("http://localhost:8000/notifications/45/read").mock(
        return_value=httpx.Response(200)
    )
    result = cli_runner.invoke(app, ["notify", "read", "45"])
    assert result.exit_code == 0, result.output
    assert "read" in result.output.lower()
    assert route.called


def test_notify_list_auth_header(cli_runner, api):
    """Verify Authorization header is present on GET /notifications."""
    route = api.get("http://localhost:8000/notifications").mock(
        return_value=httpx.Response(200, json=[])
    )
    cli_runner.invoke(app, ["notify", "list"])
    assert route.calls[0].request.headers["authorization"] == "Bearer e2e-test-token"
