"""Tests for epic commands: list, create, update, delete."""
from unittest.mock import MagicMock

import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    config.set_token("test-tok")


EPICS = [
    {"id": 1, "title": "User Auth", "status": "done", "progress": 100, "end_date": "2026-03-10"},
    {"id": 2, "title": "Feed Feature", "status": "in_progress", "progress": 45, "end_date": "2026-04-01"},
]


def _mock(monkeypatch, method, return_data, cmd_module="kanban.cli.commands.epics"):
    mc = MagicMock()
    mr = MagicMock()
    mr.status_code = 200
    mr.json.return_value = return_data
    getattr(mc, method).return_value = mr
    monkeypatch.setattr(f"{cmd_module}.get_client", lambda: mc)
    return mc


def test_epic_list(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "get", EPICS)
    runner = CliRunner()
    result = runner.invoke(app, ["epic", "list", "1"])
    assert result.exit_code == 0, result.output
    assert "User Auth" in result.output
    assert "Feed Feature" in result.output
    assert "100" in result.output
    mc.get.assert_called_once_with("/projects/1/epics")


def test_epic_create(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "post", {"id": 3, "title": "Settings Page"})
    runner = CliRunner()
    result = runner.invoke(app, ["epic", "create", "1", "--title", "Settings Page", "--end-date", "2026-04-20"])
    assert result.exit_code == 0, result.output
    assert "3" in result.output
    called_json = mc.post.call_args[1]["json"]
    assert called_json["title"] == "Settings Page"
    assert called_json["end_date"] == "2026-04-20"


def test_epic_update(monkeypatch, tmp_config_dir):
    mc = _mock(monkeypatch, "patch", {"id": 2, "status": "done"})
    runner = CliRunner()
    result = runner.invoke(app, ["epic", "update", "2", "--status", "done"])
    assert result.exit_code == 0, result.output
    assert "updated" in result.output.lower()
    mc.patch.assert_called_once_with("/epics/2", json={"status": "done"})


def test_epic_update_no_fields_exits(monkeypatch, tmp_config_dir):
    runner = CliRunner()
    result = runner.invoke(app, ["epic", "update", "2"])
    assert result.exit_code != 0


def test_epic_delete_confirmed(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    get_resp = MagicMock(); get_resp.status_code = 200; get_resp.json.return_value = {"id": 3, "title": "Settings Page"}
    del_resp = MagicMock(); del_resp.status_code = 204
    mc.get.return_value = get_resp
    mc.delete.return_value = del_resp
    monkeypatch.setattr("kanban.cli.commands.epics.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["epic", "delete", "3"], input="y\n")
    assert result.exit_code == 0, result.output
    assert "deleted" in result.output.lower()
    mc.delete.assert_called_once_with("/epics/3")


def test_epic_delete_aborted(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    get_resp = MagicMock(); get_resp.status_code = 200; get_resp.json.return_value = {"id": 3, "title": "Settings Page"}
    mc.get.return_value = get_resp
    monkeypatch.setattr("kanban.cli.commands.epics.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["epic", "delete", "3"], input="N\n")
    assert result.exit_code == 0
    mc.delete.assert_not_called()
