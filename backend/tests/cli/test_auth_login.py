"""Login writes token via the new auth flow (backward-compat config test)."""
from unittest.mock import patch

from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


def test_auth_login_writes_token(tmp_config_dir):
    """login saves the token received from the OAuth callback."""
    runner = CliRunner()

    with patch("kanban.cli.commands.auth._get_oauth_url", return_value="https://accounts.google.com/auth?foo=1"), \
         patch("kanban.cli.commands.auth._run_local_callback", return_value={"token": "abc123", "name": "Test User", "email": "test@example.com"}), \
         patch("webbrowser.open"):
        result = runner.invoke(app, ["login"])

    assert result.exit_code == 0, result.output
    assert config.get_token() == "abc123"

