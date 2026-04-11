"""E2E Journey 7: Error scenarios.

Tests that APIClient correctly handles 401, 404, and 5xx responses:
  - 401 → exits with code 1, prints "not logged in" message
  - 404 → exits with code 1, prints "Not found." message
  - 500 → exits with code 1, prints "Error 500: ..." message

These scenarios are impossible to cover with unit tests (which mock the client entirely).
"""
from __future__ import annotations

import httpx

from kanban.cli.main import app


def test_401_exits_with_auth_error(cli_runner, api):
    """401 response → exit 1, user-friendly message."""
    api.get("http://localhost:8000/projects").mock(
        return_value=httpx.Response(401)
    )
    result = cli_runner.invoke(app, ["project", "list"])
    assert result.exit_code == 1
    combined = result.output + (result.stderr or "")
    assert "not logged in" in combined.lower()


def test_404_exits_with_not_found(cli_runner, api):
    """404 response → exit 1, 'Not found.' message."""
    api.get("http://localhost:8000/projects/999").mock(
        return_value=httpx.Response(404)
    )
    result = cli_runner.invoke(app, ["project", "show", "999"])
    assert result.exit_code == 1
    combined = result.output + (result.stderr or "")
    assert "not found" in combined.lower()


def test_500_exits_with_error_detail(cli_runner, api):
    """500 response → exit 1, 'Error 500: ...' message."""
    api.get("http://localhost:8000/projects").mock(
        return_value=httpx.Response(500, json={"detail": "Internal server error"})
    )
    result = cli_runner.invoke(app, ["project", "list"])
    assert result.exit_code == 1
    combined = result.output + (result.stderr or "")
    assert "500" in combined


def test_422_exits_with_error_detail(cli_runner, api):
    """422 Unprocessable Entity → exit 1, prints detail."""
    api.post("http://localhost:8000/projects").mock(
        return_value=httpx.Response(422, json={"detail": "Field required: name"})
    )
    result = cli_runner.invoke(app, ["project", "create", "--name", ""])
    assert result.exit_code == 1
    combined = result.output + (result.stderr or "")
    assert "422" in combined


def test_auth_header_absent_when_no_token(cli_runner, isolated_config):
    """When no token is configured, Authorization header should not be sent."""
    import respx
    from kanban import config

    config.set_server_url("http://localhost:8000")
    # Deliberately do NOT set a token

    with respx.mock(assert_all_called=False) as mock:
        route = mock.get("http://localhost:8000/auth/me").mock(
            return_value=httpx.Response(401)
        )
        cli_runner.invoke(app, ["whoami"])
        # whoami short-circuits before HTTP if no token, but ensure no stray auth header
        if route.called:
            assert "authorization" not in route.calls[0].request.headers
