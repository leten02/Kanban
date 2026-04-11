"""Tests for subtask commands: list, create, update, done, delete."""
from unittest.mock import MagicMock

import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    config.set_token("test-tok")


SUBTASKS = [
    {"id": 1, "title": "Design the login form", "is_completed": True, "assignee": "Jiyeon Park"},
    {"id": 2, "title": "Connect to auth API", "is_completed": False, "assignee": "Minho Kim"},
    {"id": 3, "title": "Write unit tests", "is_completed": False, "assignee": None},
]


def _mock(monkeypatch, method, return_data):
    mc = MagicMock()
    mr = MagicMock(); mr.status_code = 200; mr.json.return_value = return_data
    getattr(mc, method).return_value = mr
    monkeypatch.setattr("kanban.cli.commands.subtasks.get_client", lambda: mc)
    return mc


def test_subtask_list(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "get", SUBTASKS)
    runner = CliRunner()
    result = runner.invoke(app, ["subtask", "list", "4"])
    assert result.exit_code == 0, result.output
    assert "Design the login form" in result.output
    assert "Connect to auth API" in result.output
    mc.get.assert_called_once_with("/tasks/4/subtasks")


def test_subtask_create(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "post", {"id": 3, "title": "Write unit tests"})
    runner = CliRunner()
    result = runner.invoke(app, ["subtask", "create", "4", "--title", "Write unit tests", "--assignee-id", "3"])
    assert result.exit_code == 0, result.output
    assert "3" in result.output
    called_json = mc.post.call_args[1]["json"]
    assert called_json["title"] == "Write unit tests"
    assert called_json["assignee_user_id"] == 3


def test_subtask_update(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "patch", {"id": 3, "title": "Write unit and integration tests"})
    runner = CliRunner()
    result = runner.invoke(app, ["subtask", "update", "3", "--title", "Write unit and integration tests"])
    assert result.exit_code == 0, result.output
    assert "updated" in result.output.lower()
    mc.patch.assert_called_once_with("/subtasks/3", json={"title": "Write unit and integration tests"})


def test_subtask_update_no_fields_exits(monkeypatch, tmp_config_dir):
    runner = CliRunner()
    result = runner.invoke(app, ["subtask", "update", "3"])
    assert result.exit_code != 0


def test_subtask_done_shows_progress(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "patch", {"id": 2, "task_progress": 67})
    runner = CliRunner()
    result = runner.invoke(app, ["subtask", "done", "2"])
    assert result.exit_code == 0, result.output
    assert "done" in result.output.lower()
    assert "67" in result.output
    mc.patch.assert_called_once_with("/subtasks/2", json={"is_completed": True})


def test_subtask_delete(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    del_resp = MagicMock(); del_resp.status_code = 204
    mc.delete.return_value = del_resp
    monkeypatch.setattr("kanban.cli.commands.subtasks.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["subtask", "delete", "3"])
    assert result.exit_code == 0, result.output
    assert "deleted" in result.output.lower()
    mc.delete.assert_called_once_with("/subtasks/3")
