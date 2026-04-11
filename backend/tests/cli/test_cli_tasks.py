"""Tests for task commands: list, create, update, move, delete."""
from unittest.mock import MagicMock

import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    config.set_token("test-tok")


TASKS = [
    {"id": 4, "title": "Build login page", "assignee": "Jiyeon Park", "priority": "high", "due_date": "2026-03-20"},
    {"id": 7, "title": "Write API tests", "assignee": "Minho Kim", "priority": "medium", "due_date": "2026-03-25"},
]


def _mock(monkeypatch, method, return_data):
    mc = MagicMock()
    mr = MagicMock(); mr.status_code = 200; mr.json.return_value = return_data
    getattr(mc, method).return_value = mr
    monkeypatch.setattr("kanban.cli.commands.tasks.get_client", lambda: mc)
    return mc


def test_task_list(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "get", TASKS)
    runner = CliRunner()
    result = runner.invoke(app, ["task", "list", "1"])
    assert result.exit_code == 0, result.output
    assert "Build login page" in result.output
    assert "Write API tests" in result.output
    mc.get.assert_called_once_with("/projects/1/tasks", params={})


def test_task_list_with_status_filter(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "get", TASKS)
    runner = CliRunner()
    result = runner.invoke(app, ["task", "list", "1", "--status", "in_progress"])
    assert result.exit_code == 0, result.output
    mc.get.assert_called_once_with("/projects/1/tasks", params={"status": "in_progress"})


def test_task_create(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "post", {"id": 4, "title": "Build login page"})
    runner = CliRunner()
    result = runner.invoke(app, ["task", "create", "2", "--title", "Build login page", "--priority", "high", "--due-date", "2026-03-20"])
    assert result.exit_code == 0, result.output
    assert "4" in result.output
    called_json = mc.post.call_args[1]["json"]
    assert called_json["title"] == "Build login page"
    assert called_json["priority"] == "high"


def test_task_update(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "patch", {"id": 4})
    runner = CliRunner()
    result = runner.invoke(app, ["task", "update", "4", "--assignee-id", "2", "--due-date", "2026-03-22"])
    assert result.exit_code == 0, result.output
    assert "updated" in result.output.lower()
    called_json = mc.patch.call_args[1]["json"]
    assert called_json["assignee_user_id"] == 2
    assert called_json["due_date"] == "2026-03-22"


def test_task_update_no_fields_exits(monkeypatch, tmp_config_dir):
    runner = CliRunner()
    result = runner.invoke(app, ["task", "update", "4"])
    assert result.exit_code != 0


def test_task_move(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "patch", {"id": 4, "status": "in_review"})
    runner = CliRunner()
    result = runner.invoke(app, ["task", "move", "4", "in_review"])
    assert result.exit_code == 0, result.output
    assert "In Review" in result.output
    mc.patch.assert_called_once_with("/tasks/4/status", json={"status": "in_review"})


def test_task_delete_confirmed(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    get_resp = MagicMock(); get_resp.status_code = 200; get_resp.json.return_value = {"id": 4, "title": "Build login page"}
    del_resp = MagicMock(); del_resp.status_code = 204
    mc.get.return_value = get_resp
    mc.delete.return_value = del_resp
    monkeypatch.setattr("kanban.cli.commands.tasks.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["task", "delete", "4"], input="y\n")
    assert result.exit_code == 0, result.output
    assert "deleted" in result.output.lower()
    mc.delete.assert_called_once_with("/tasks/4")


def test_task_delete_aborted(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    get_resp = MagicMock(); get_resp.status_code = 200; get_resp.json.return_value = {"id": 4, "title": "Build login page"}
    mc.get.return_value = get_resp
    monkeypatch.setattr("kanban.cli.commands.tasks.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["task", "delete", "4"], input="N\n")
    assert result.exit_code == 0
    mc.delete.assert_not_called()
