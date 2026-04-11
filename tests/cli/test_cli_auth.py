"""Tests for auth commands: login, logout, whoami."""
import json
from unittest.mock import MagicMock, patch

import httpx
import pytest
from typer.testing import CliRunner

from kanban.cli.main import app
from kanban import config


@pytest.fixture(autouse=True)
def isolated_config(tmp_config_dir):
    """Each test gets a clean config dir (from conftest.py fixture)."""


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------

def test_login_saves_token_and_shows_user(tmp_config_dir):
    """login fetches OAuth URL, opens browser, receives token via local callback."""
    mock_response_login = MagicMock()
    mock_response_login.status_code = 200
    mock_response_login.json.return_value = {"url": "https://accounts.google.com/o/oauth2/auth?foo=1"}

    runner = CliRunner()

    with patch("kanban.cli.commands.auth._get_oauth_url", return_value="https://accounts.google.com/o/oauth2/auth?foo=1"), \
         patch("kanban.cli.commands.auth._run_local_callback", return_value={"token": "tok-123", "name": "Jiyeon Park", "email": "jiyeon@gachon.ac.kr"}), \
         patch("webbrowser.open") as mock_browser:

        result = runner.invoke(app, ["login"])

    assert result.exit_code == 0, result.output
    assert "Logged in as" in result.output
    assert "Jiyeon Park" in result.output
    assert "jiyeon@gachon.ac.kr" in result.output
    assert mock_browser.called
    assert config.get_token() == "tok-123"


def test_login_server_error_exits(tmp_config_dir):
    """login exits non-zero if server returns an error."""
    with patch("kanban.cli.commands.auth._get_oauth_url", side_effect=SystemExit(1)):
        runner = CliRunner()
        result = runner.invoke(app, ["login"])
    assert result.exit_code != 0


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------

def test_logout_clears_token_and_shows_message(tmp_config_dir, monkeypatch):
    # pre-save a token
    config.set_token("existing-tok")

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_client.post.return_value = mock_resp
    monkeypatch.setattr("kanban.cli.commands.auth.get_client", lambda: mock_client)

    runner = CliRunner()
    result = runner.invoke(app, ["logout"])

    assert result.exit_code == 0, result.output
    assert "signed out" in result.output.lower()
    assert config.get_token() is None
    mock_client.post.assert_called_once_with("/auth/logout")


def test_logout_without_token_still_succeeds(tmp_config_dir, monkeypatch):
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_client.post.return_value = mock_resp
    monkeypatch.setattr("kanban.cli.commands.auth.get_client", lambda: mock_client)

    runner = CliRunner()
    result = runner.invoke(app, ["logout"])
    assert result.exit_code == 0


# ---------------------------------------------------------------------------
# whoami
# ---------------------------------------------------------------------------

def test_whoami_shows_name_and_email(tmp_config_dir, monkeypatch):
    config.set_token("tok-123")

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"name": "Jiyeon Park", "email": "jiyeon@gachon.ac.kr"}
    mock_client.get.return_value = mock_resp
    monkeypatch.setattr("kanban.cli.commands.auth.get_client", lambda: mock_client)

    runner = CliRunner()
    result = runner.invoke(app, ["whoami"])

    assert result.exit_code == 0, result.output
    assert "Jiyeon Park" in result.output
    assert "jiyeon@gachon.ac.kr" in result.output
    mock_client.get.assert_called_once_with("/auth/me")


def test_whoami_no_token_shows_error(tmp_config_dir):
    runner = CliRunner()
    result = runner.invoke(app, ["whoami"])
    assert result.exit_code != 0
