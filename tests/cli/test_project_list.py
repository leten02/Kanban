"""project list — HTTP-based (backward-compat test)."""
from unittest.mock import MagicMock

from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


def test_project_list_shows_created(tmp_config_dir, monkeypatch):
    config.set_token("tok")
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [{"id": 1, "name": "Beta", "created_at": "2026-01-01"}]
    mock_client.get.return_value = mock_resp
    monkeypatch.setattr("kanban.cli.commands.project.get_client", lambda: mock_client)

    runner = CliRunner()
    result = runner.invoke(app, ["project", "list"])
    assert result.exit_code == 0, result.output
    assert "Beta" in result.output

