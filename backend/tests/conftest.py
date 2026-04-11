import os
import pytest
from typer.testing import CliRunner
from pathlib import Path
import asyncio


@pytest.fixture
def cli_runner():
    return CliRunner()


@pytest.fixture
def tmp_config_dir(tmp_path, monkeypatch):
    d = tmp_path / "kanban_config"
    d.mkdir()
    monkeypatch.setenv("KANBAN_CONFIG_DIR", str(d))
    monkeypatch.setenv("HOME", str(tmp_path))
    return d


@pytest.fixture
def tmp_sqlite_url(tmp_path, monkeypatch):
    db_file = tmp_path / "test.db"
    url = f"sqlite+aiosqlite:///{db_file}"
    monkeypatch.setenv("KANBAN_DB_URL", url)
    return url


@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
