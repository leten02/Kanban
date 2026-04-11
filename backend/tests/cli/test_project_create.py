"""project create — HTTP-based (backward-compat test)."""
from unittest.mock import MagicMock

from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


def test_project_create(tmp_config_dir, monkeypatch):
    config.set_token("tok")
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": 1, "name": "Alpha"}
    mock_client.post.return_value = mock_resp
    monkeypatch.setattr("kanban.cli.commands.project.get_client", lambda: mock_client)

    runner = CliRunner()
    result = runner.invoke(app, ["project", "create", "--name", "Alpha"])
    assert result.exit_code == 0, result.output
    mock_client.post.assert_called_once()

