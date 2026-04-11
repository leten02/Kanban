"""Tests for project commands: list, create, show, update, delete."""
from unittest.mock import MagicMock

import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    config.set_token("test-tok")


def _mock_client(monkeypatch, method: str, path: str, response_data, status=200):
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = status
    mock_resp.json.return_value = response_data
    getattr(mock_client, method).return_value = mock_resp
    monkeypatch.setattr("kanban.cli.commands.project.get_client", lambda: mock_client)
    return mock_client


# ---------------------------------------------------------------------------
# project list
# ---------------------------------------------------------------------------

def test_project_list_shows_table(monkeypatch, tmp_config_dir):
    projects = [
        {"id": 1, "name": "Mobile App", "created_at": "2026-03-01"},
        {"id": 2, "name": "Backend Redesign", "created_at": "2026-03-15"},
    ]
    mc = _mock_client(monkeypatch, "get", "/projects", projects)

    runner = CliRunner()
    result = runner.invoke(app, ["project", "list"])

    assert result.exit_code == 0, result.output
    assert "Mobile App" in result.output
    assert "Backend Redesign" in result.output
    mc.get.assert_called_once_with("/projects")


def test_project_list_empty(monkeypatch, tmp_config_dir):
    mc = _mock_client(monkeypatch, "get", "/projects", [])
    runner = CliRunner()
    result = runner.invoke(app, ["project", "list"])
    assert result.exit_code == 0


# ---------------------------------------------------------------------------
# project create
# ---------------------------------------------------------------------------

def test_project_create(monkeypatch, tmp_config_dir):
    mc = _mock_client(monkeypatch, "post", "/projects", {"id": 3, "name": "New Project"})

    runner = CliRunner()
    result = runner.invoke(app, ["project", "create", "--name", "New Project"])

    assert result.exit_code == 0, result.output
    assert "3" in result.output
    mc.post.assert_called_once_with("/projects", json={"name": "New Project", "description": None})


def test_project_create_with_description(monkeypatch, tmp_config_dir):
    mc = _mock_client(monkeypatch, "post", "/projects", {"id": 4, "name": "With Desc"})

    runner = CliRunner()
    result = runner.invoke(app, ["project", "create", "--name", "With Desc", "--description", "Some desc"])

    assert result.exit_code == 0, result.output
    mc.post.assert_called_once_with("/projects", json={"name": "With Desc", "description": "Some desc"})


# ---------------------------------------------------------------------------
# project show
# ---------------------------------------------------------------------------

def test_project_show(monkeypatch, tmp_config_dir):
    mc = _mock_client(monkeypatch, "get", "/projects/1", {
        "id": 1, "name": "Mobile App", "description": "iOS and Android", "created_at": "2026-03-01"
    })

    runner = CliRunner()
    result = runner.invoke(app, ["project", "show", "1"])

    assert result.exit_code == 0, result.output
    assert "Mobile App" in result.output
    assert "iOS and Android" in result.output
    mc.get.assert_called_once_with("/projects/1")


# ---------------------------------------------------------------------------
# project update
# ---------------------------------------------------------------------------

def test_project_update_name(monkeypatch, tmp_config_dir):
    mc = _mock_client(monkeypatch, "patch", "/projects/1", {"id": 1, "name": "Mobile App v2"})

    runner = CliRunner()
    result = runner.invoke(app, ["project", "update", "1", "--name", "Mobile App v2"])

    assert result.exit_code == 0, result.output
    assert "updated" in result.output.lower()
    mc.patch.assert_called_once_with("/projects/1", json={"name": "Mobile App v2"})


def test_project_update_no_fields_exits(monkeypatch, tmp_config_dir):
    runner = CliRunner()
    result = runner.invoke(app, ["project", "update", "1"])
    assert result.exit_code != 0


# ---------------------------------------------------------------------------
# project delete
# ---------------------------------------------------------------------------

def test_project_delete_confirmed(monkeypatch, tmp_config_dir):
    # GET for the name
    mock_client = MagicMock()
    mock_get = MagicMock()
    mock_get.status_code = 200
    mock_get.json.return_value = {"id": 1, "name": "Mobile App"}
    mock_del = MagicMock()
    mock_del.status_code = 204
    mock_client.get.return_value = mock_get
    mock_client.delete.return_value = mock_del
    monkeypatch.setattr("kanban.cli.commands.project.get_client", lambda: mock_client)

    runner = CliRunner()
    result = runner.invoke(app, ["project", "delete", "1"], input="y\n")

    assert result.exit_code == 0, result.output
    assert "deleted" in result.output.lower()
    mock_client.delete.assert_called_once_with("/projects/1")


def test_project_delete_aborted(monkeypatch, tmp_config_dir):
    mock_client = MagicMock()
    mock_get = MagicMock()
    mock_get.status_code = 200
    mock_get.json.return_value = {"id": 1, "name": "Mobile App"}
    mock_client.get.return_value = mock_get
    monkeypatch.setattr("kanban.cli.commands.project.get_client", lambda: mock_client)

    runner = CliRunner()
    result = runner.invoke(app, ["project", "delete", "1"], input="N\n")

    assert result.exit_code == 0
    mock_client.delete.assert_not_called()
