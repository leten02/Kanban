"""Tests for team command: show."""
from unittest.mock import MagicMock

import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    config.set_token("test-tok")


def test_team_show(monkeypatch, tmp_config_dir):
    mc = MagicMock()
    mr = MagicMock()
    mr.status_code = 200
    mr.json.return_value = {
        "name": "Gachon Dev Squad",
        "members": [
            {"id": 1, "name": "Jiyeon Park", "email": "jiyeon@gachon.ac.kr"},
            {"id": 2, "name": "Minho Kim", "email": "minho@gachon.ac.kr"},
            {"id": 3, "name": "Sua Lee", "email": "sua@gachon.ac.kr"},
        ],
    }
    mc.get.return_value = mr
    monkeypatch.setattr("kanban.cli.commands.team.get_client", lambda: mc)

    runner = CliRunner()
    result = runner.invoke(app, ["team", "show"])

    assert result.exit_code == 0, result.output
    assert "Gachon Dev Squad" in result.output
    assert "Jiyeon Park" in result.output
    assert "minho@gachon.ac.kr" in result.output
    mc.get.assert_called_once_with("/teams/me")
