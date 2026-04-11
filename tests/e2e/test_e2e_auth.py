"""E2E Journey 1: Auth flow.

whoami (unauthenticated) → login (mocked browser) → whoami → logout → whoami (unauthenticated)

Key differences from unit tests:
  - login: _get_oauth_url / _run_local_callback are patched (they use raw httpx, not APIClient)
  - whoami / logout: real APIClient runs, respx intercepts the HTTP requests
"""
from __future__ import annotations

import httpx
import pytest

from kanban import config
from kanban.cli.main import app


def test_whoami_unauthenticated(cli_runner, isolated_config):
    """whoami without a token exits 1 and prints an error."""
    result = cli_runner.invoke(app, ["whoami"])
    assert result.exit_code == 1
    assert "not logged in" in (result.output + (result.stderr or "")).lower()


def test_login_saves_token_and_shows_user(cli_runner, isolated_config, monkeypatch):
    """login: OAuth URL fetched, browser opened (mocked), token saved to config."""
    monkeypatch.setattr(
        "kanban.cli.commands.auth._get_oauth_url",
        lambda url, callback_port=None: "https://accounts.google.com/fake-oauth",
    )
    monkeypatch.setattr(
        "kanban.cli.commands.auth._run_local_callback",
        lambda port=0: {
            "token": "fresh-login-token",
            "name": "Jiyeon Park",
            "email": "jiyeon@gachon.ac.kr",
            "port": 12345,
        },
    )
    monkeypatch.setattr("webbrowser.open", lambda url: None)

    config.set_server_url("http://localhost:8000")

    result = cli_runner.invoke(app, ["login"])
    assert result.exit_code == 0, result.output
    assert "Jiyeon Park" in result.output
    assert config.get_token() == "fresh-login-token"


def test_whoami_shows_authenticated_user(cli_runner, api):
    """whoami calls GET /auth/me and prints name + email."""
    api.get("http://localhost:8000/auth/me").mock(
        return_value=httpx.Response(200, json={"name": "Jiyeon Park", "email": "jiyeon@gachon.ac.kr"})
    )

    result = cli_runner.invoke(app, ["whoami"])
    assert result.exit_code == 0, result.output
    assert "Jiyeon Park" in result.output
    assert "jiyeon@gachon.ac.kr" in result.output


def test_logout_calls_server_and_clears_token(cli_runner, api):
    """logout POSTs /auth/logout and clears the local token."""
    logout_route = api.post("http://localhost:8000/auth/logout").mock(
        return_value=httpx.Response(200)
    )

    result = cli_runner.invoke(app, ["logout"])
    assert result.exit_code == 0, result.output
    assert "signed out" in result.output.lower()
    assert logout_route.called
    assert config.get_token() is None


def test_whoami_after_logout_shows_error(cli_runner, isolated_config):
    """After logout clears the token, whoami should fail again."""
    config.set_server_url("http://localhost:8000")
    # No token set — simulate post-logout state
    result = cli_runner.invoke(app, ["whoami"])
    assert result.exit_code == 1
    assert "not logged in" in (result.output + (result.stderr or "")).lower()
