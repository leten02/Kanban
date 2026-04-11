"""Tests for notify commands: list, read, stream."""
from unittest.mock import MagicMock, patch

import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    config.set_token("test-tok")


NOTIFICATIONS = [
    {"id": 45, "is_read": False, "message": "Minho Kim commented on your daily post", "created_at": "5 min ago"},
    {"id": 44, "is_read": True, "message": "You were mentioned in a weekly snippet", "created_at": "2 hours ago"},
]


def test_notify_list(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    mr = MagicMock(); mr.status_code = 200; mr.json.return_value = NOTIFICATIONS
    mc.get.return_value = mr
    monkeypatch.setattr("kanban.cli.commands.notify.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["notify", "list"])

    assert result.exit_code == 0, result.output
    assert "Minho Kim commented" in result.output
    mc.get.assert_called_once_with("/notifications", params={"limit": 20})


def test_notify_list_with_limit(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    mr = MagicMock(); mr.status_code = 200; mr.json.return_value = []
    mc.get.return_value = mr
    monkeypatch.setattr("kanban.cli.commands.notify.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["notify", "list", "--limit", "5"])
    assert result.exit_code == 0
    mc.get.assert_called_once_with("/notifications", params={"limit": 5})


def test_notify_read(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    mr = MagicMock(); mr.status_code = 200; mr.json.return_value = {"id": 45, "is_read": True}
    mc.patch.return_value = mr
    monkeypatch.setattr("kanban.cli.commands.notify.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["notify", "read", "45"])

    assert result.exit_code == 0, result.output
    assert "read" in result.output.lower()
    mc.patch.assert_called_once_with("/notifications/45/read")


def test_notify_stream_connects_and_exits_on_keyboard_interrupt(monkeypatch, tmp_config_dir):
    """stream command shows connected message and exits cleanly on KeyboardInterrupt."""
    def _fake_stream(*args, **kwargs):
        raise KeyboardInterrupt

    monkeypatch.setattr("kanban.cli.commands.notify._stream_sse", _fake_stream)

    runner = CliRunner()
    result = runner.invoke(app, ["notify", "stream"])
    assert result.exit_code == 0
