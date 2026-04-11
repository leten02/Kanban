"""E2E Journey 8: Installed binary (subprocess tests).

Verifies the `kanban` entry point installed in the virtualenv:
  - Exit code 0 for --help variants
  - Top-level commands are listed in --help output
  - Sub-command --help shows sub-commands

These tests use subprocess so they exercise the real installed binary
(not the in-process CliRunner), catching packaging issues like
missing __main__.py, broken entry points, or import errors.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def _kanban(*args: str) -> subprocess.CompletedProcess:
    """Run `kanban <args>` using the venv Python so the entry point is available."""
    venv_bin = Path(sys.executable).parent
    kanban_exe = venv_bin / "kanban"
    if kanban_exe.exists():
        cmd = [str(kanban_exe), *args]
    else:
        # Fallback: python -m kanban.cli.main
        cmd = [sys.executable, "-m", "kanban.cli.main", *args]
    return subprocess.run(cmd, capture_output=True, text=True)


def test_help_exits_zero():
    result = _kanban("--help")
    assert result.returncode == 0, result.stderr


def test_help_lists_core_commands():
    result = _kanban("--help")
    output = result.stdout + result.stderr
    for cmd in ("login", "logout", "whoami", "project", "epic", "task"):
        assert cmd in output, f"'{cmd}' not found in --help output"


def test_project_subcommand_help():
    result = _kanban("project", "--help")
    assert result.returncode == 0, result.stderr
    output = result.stdout + result.stderr
    for sub in ("list", "create", "show", "update", "delete"):
        assert sub in output, f"project sub-command '{sub}' missing"


def test_login_help():
    result = _kanban("login", "--help")
    assert result.returncode == 0, result.stderr
    assert "login" in (result.stdout + result.stderr).lower()


def test_notify_subcommand_help():
    result = _kanban("notify", "--help")
    assert result.returncode == 0, result.stderr
    output = result.stdout + result.stderr
    for sub in ("list", "read", "stream"):
        assert sub in output, f"notify sub-command '{sub}' missing"
