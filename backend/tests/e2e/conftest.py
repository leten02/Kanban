"""Shared fixtures for E2E tests.

E2E tests differ from unit tests:
  - Unit tests: monkeypatch `get_client` → skip all HTTP code
  - E2E tests: let real APIClient run, intercept at httpx transport via respx
"""
from __future__ import annotations

import pytest
import respx
from typer.testing import CliRunner

from kanban import config


BASE_URL = "http://localhost:8000"
E2E_TOKEN = "e2e-test-token"


@pytest.fixture
def cli_runner():
    return CliRunner()


@pytest.fixture(autouse=True)
def isolated_config(tmp_path, monkeypatch):
    """Every E2E test gets a fresh, isolated config directory."""
    d = tmp_path / "kanban_config"
    d.mkdir()
    monkeypatch.setenv("KANBAN_CONFIG_DIR", str(d))
    monkeypatch.setenv("HOME", str(tmp_path))
    return d


@pytest.fixture
def api(isolated_config):
    """respx transport-level mock with a pre-authenticated config.

    Use this fixture when the test needs to call authenticated CLI commands.
    The real APIClient runs; respx intercepts httpx at transport level.
    """
    config.set_server_url(BASE_URL)
    config.set_token(E2E_TOKEN)
    with respx.mock(assert_all_called=False) as router:
        yield router
