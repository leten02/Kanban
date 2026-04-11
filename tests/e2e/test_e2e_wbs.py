"""E2E Journey 3: WBS hierarchy.

project→epic→task→subtask×2 → subtask done(50%) → done(100%)

Verifies the full WBS drill-down: project ID feeds epic, epic ID feeds task, task ID feeds subtasks.
Progress percentage is computed server-side and echoed back by the CLI.
"""
from __future__ import annotations

import json

import httpx

from kanban.cli.main import app


def test_epic_list_shows_progress(cli_runner, api):
    """epic list displays a Progress % column."""
    api.get("http://localhost:8000/projects/1/epics").mock(
        return_value=httpx.Response(200, json=[
            {"id": 1, "title": "MVP", "status": "in_progress", "progress": 0, "end_date": "2026-06-30"}
        ])
    )
    result = cli_runner.invoke(app, ["epic", "list", "1"])
    assert result.exit_code == 0, result.output
    assert "MVP" in result.output
    assert "0%" in result.output


def test_epic_create_returns_id(cli_runner, api):
    route = api.post("http://localhost:8000/projects/1/epics").mock(
        return_value=httpx.Response(201, json={"id": 1, "title": "MVP"})
    )
    result = cli_runner.invoke(app, ["epic", "create", "1", "--title", "MVP"])
    assert result.exit_code == 0, result.output
    assert "ID: 1" in result.output
    assert json.loads(route.calls[0].request.content)["title"] == "MVP"


def test_task_create_under_epic(cli_runner, api):
    route = api.post("http://localhost:8000/epics/1/tasks").mock(
        return_value=httpx.Response(201, json={"id": 1, "title": "Build auth"})
    )
    result = cli_runner.invoke(app, ["task", "create", "1", "--title", "Build auth"])
    assert result.exit_code == 0, result.output
    assert "ID: 1" in result.output
    assert json.loads(route.calls[0].request.content)["title"] == "Build auth"


def test_subtask_create_first(cli_runner, api):
    route = api.post("http://localhost:8000/tasks/1/subtasks").mock(
        return_value=httpx.Response(201, json={"id": 1, "title": "Write tests"})
    )
    result = cli_runner.invoke(app, ["subtask", "create", "1", "--title", "Write tests"])
    assert result.exit_code == 0, result.output
    assert "ID: 1" in result.output
    assert json.loads(route.calls[0].request.content)["title"] == "Write tests"


def test_subtask_create_second(cli_runner, api):
    api.post("http://localhost:8000/tasks/1/subtasks").mock(
        return_value=httpx.Response(201, json={"id": 2, "title": "Deploy"})
    )
    result = cli_runner.invoke(app, ["subtask", "create", "1", "--title", "Deploy"])
    assert result.exit_code == 0, result.output
    assert "ID: 2" in result.output


def test_subtask_done_shows_50_percent(cli_runner, api):
    """Marking first subtask done → server returns task_progress=50."""
    api.patch("http://localhost:8000/subtasks/1").mock(
        return_value=httpx.Response(200, json={"id": 1, "is_completed": True, "task_progress": 50})
    )
    result = cli_runner.invoke(app, ["subtask", "done", "1"])
    assert result.exit_code == 0, result.output
    assert "50%" in result.output


def test_subtask_done_shows_100_percent(cli_runner, api):
    """Marking second subtask done → server returns task_progress=100."""
    api.patch("http://localhost:8000/subtasks/2").mock(
        return_value=httpx.Response(200, json={"id": 2, "is_completed": True, "task_progress": 100})
    )
    result = cli_runner.invoke(app, ["subtask", "done", "2"])
    assert result.exit_code == 0, result.output
    assert "100%" in result.output


def test_subtask_list_shows_done_column(cli_runner, api):
    api.get("http://localhost:8000/tasks/1/subtasks").mock(
        return_value=httpx.Response(200, json=[
            {"id": 1, "title": "Write tests", "is_completed": True, "assignee": None},
            {"id": 2, "title": "Deploy", "is_completed": False, "assignee": None},
        ])
    )
    result = cli_runner.invoke(app, ["subtask", "list", "1"])
    assert result.exit_code == 0
    assert "Write tests" in result.output
    assert "Yes" in result.output   # is_completed=True
    assert "No" in result.output    # is_completed=False
