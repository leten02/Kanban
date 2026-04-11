"""E2E Journey 4: Kanban board (task status moves).

task list → move in_progress → move in_review → move done → delete (confirmed)

Verifies:
  - GET /projects/{id}/tasks with optional ?status= query param
  - PATCH /tasks/{id}/status with correct JSON body
  - CLI prints the human-readable status label (not the enum value)
"""
from __future__ import annotations

import json

import httpx

from kanban.cli.main import app

_TASK = {"id": 4, "title": "Build login page", "assignee": None, "priority": "high", "due_date": "2026-05-01"}


def test_task_list_all(cli_runner, api):
    api.get("http://localhost:8000/projects/1/tasks").mock(
        return_value=httpx.Response(200, json=[_TASK])
    )
    result = cli_runner.invoke(app, ["task", "list", "1"])
    assert result.exit_code == 0
    assert "Build login page" in result.output


def test_task_list_with_status_filter(cli_runner, api):
    """--status filter is sent as a query parameter."""
    route = api.get("http://localhost:8000/projects/1/tasks").mock(
        return_value=httpx.Response(200, json=[_TASK])
    )
    result = cli_runner.invoke(app, ["task", "list", "1", "--status", "todo"])
    assert result.exit_code == 0
    # Verify query param was forwarded
    assert route.calls[0].request.url.params.get("status") == "todo"


def test_task_move_to_in_progress(cli_runner, api):
    route = api.patch("http://localhost:8000/tasks/4/status").mock(
        return_value=httpx.Response(200, json={**_TASK, "status": "in_progress"})
    )
    result = cli_runner.invoke(app, ["task", "move", "4", "in_progress"])
    assert result.exit_code == 0, result.output
    assert "In Progress" in result.output
    assert json.loads(route.calls[0].request.content) == {"status": "in_progress"}


def test_task_move_to_in_review(cli_runner, api):
    api.patch("http://localhost:8000/tasks/4/status").mock(
        return_value=httpx.Response(200, json={**_TASK, "status": "in_review"})
    )
    result = cli_runner.invoke(app, ["task", "move", "4", "in_review"])
    assert result.exit_code == 0, result.output
    assert "In Review" in result.output


def test_task_move_to_done(cli_runner, api):
    api.patch("http://localhost:8000/tasks/4/status").mock(
        return_value=httpx.Response(200, json={**_TASK, "status": "done"})
    )
    result = cli_runner.invoke(app, ["task", "move", "4", "done"])
    assert result.exit_code == 0, result.output
    assert "Done" in result.output


def test_task_delete_confirmed(cli_runner, api):
    api.get("http://localhost:8000/tasks/4").mock(
        return_value=httpx.Response(200, json=_TASK)
    )
    delete_route = api.delete("http://localhost:8000/tasks/4").mock(
        return_value=httpx.Response(204)
    )
    result = cli_runner.invoke(app, ["task", "delete", "4"], input="y\n")
    assert result.exit_code == 0, result.output
    assert "deleted" in result.output.lower()
    assert delete_route.called


def test_task_delete_aborted(cli_runner, api):
    api.get("http://localhost:8000/tasks/4").mock(
        return_value=httpx.Response(200, json=_TASK)
    )
    delete_route = api.delete("http://localhost:8000/tasks/4").mock(
        return_value=httpx.Response(204)
    )
    result = cli_runner.invoke(app, ["task", "delete", "4"], input="N\n")
    assert result.exit_code == 0
    assert not delete_route.called
