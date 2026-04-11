"""E2E Journey 2: Project CRUD.

list (empty) → create → list (shows project) → show → update (PATCH body verified) → delete (confirmed/aborted)
"""
from __future__ import annotations

import json

import httpx

from kanban.cli.main import app

_PROJECT = {"id": 1, "name": "Alpha", "description": "test desc", "created_at": "2026-01-01T00:00:00"}


def test_project_list_empty(cli_runner, api):
    api.get("http://localhost:8000/projects").mock(
        return_value=httpx.Response(200, json=[])
    )
    result = cli_runner.invoke(app, ["project", "list"])
    assert result.exit_code == 0


def test_project_create_returns_id(cli_runner, api):
    route = api.post("http://localhost:8000/projects").mock(
        return_value=httpx.Response(201, json=_PROJECT)
    )
    result = cli_runner.invoke(app, ["project", "create", "--name", "Alpha", "--description", "test desc"])
    assert result.exit_code == 0, result.output
    assert "ID: 1" in result.output

    body = json.loads(route.calls[0].request.content)
    assert body["name"] == "Alpha"
    assert body["description"] == "test desc"


def test_project_list_shows_project(cli_runner, api):
    api.get("http://localhost:8000/projects").mock(
        return_value=httpx.Response(200, json=[_PROJECT])
    )
    result = cli_runner.invoke(app, ["project", "list"])
    assert result.exit_code == 0
    assert "Alpha" in result.output


def test_project_show_details(cli_runner, api):
    api.get("http://localhost:8000/projects/1").mock(
        return_value=httpx.Response(200, json=_PROJECT)
    )
    result = cli_runner.invoke(app, ["project", "show", "1"])
    assert result.exit_code == 0
    assert "Alpha" in result.output
    assert "test desc" in result.output


def test_project_update_sends_correct_patch_body(cli_runner, api):
    route = api.patch("http://localhost:8000/projects/1").mock(
        return_value=httpx.Response(200, json={**_PROJECT, "name": "Alpha v2"})
    )
    result = cli_runner.invoke(app, ["project", "update", "1", "--name", "Alpha v2"])
    assert result.exit_code == 0, result.output
    assert "updated" in result.output.lower()

    body = json.loads(route.calls[0].request.content)
    assert body == {"name": "Alpha v2"}


def test_project_update_requires_auth_header(cli_runner, api):
    """Verify Authorization header is attached to PATCH request."""
    route = api.patch("http://localhost:8000/projects/1").mock(
        return_value=httpx.Response(200, json=_PROJECT)
    )
    cli_runner.invoke(app, ["project", "update", "1", "--name", "X"])
    assert route.calls[0].request.headers["authorization"] == "Bearer e2e-test-token"


def test_project_delete_confirmed(cli_runner, api):
    api.get("http://localhost:8000/projects/1").mock(
        return_value=httpx.Response(200, json=_PROJECT)
    )
    delete_route = api.delete("http://localhost:8000/projects/1").mock(
        return_value=httpx.Response(204)
    )
    result = cli_runner.invoke(app, ["project", "delete", "1"], input="y\n")
    assert result.exit_code == 0, result.output
    assert "deleted" in result.output.lower()
    assert delete_route.called


def test_project_delete_aborted(cli_runner, api):
    api.get("http://localhost:8000/projects/1").mock(
        return_value=httpx.Response(200, json=_PROJECT)
    )
    delete_route = api.delete("http://localhost:8000/projects/1").mock(
        return_value=httpx.Response(204)
    )
    result = cli_runner.invoke(app, ["project", "delete", "1"], input="N\n")
    assert result.exit_code == 0
    assert not delete_route.called
