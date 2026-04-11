"""Minimal config helpers for kanban CLI."""
from pathlib import Path
import os
import json
from typing import Any, Dict

_DEFAULT_SERVER_URL = "http://localhost:8000"


def get_config_dir() -> Path:
    """Return directory used to store config. Honors KANBAN_CONFIG_DIR env var, then HOME."""
    env = os.environ.get("KANBAN_CONFIG_DIR")
    if env:
        return Path(env)
    home = Path(os.environ.get("HOME", Path.home()))
    return home / ".kanban"


def get_config_path() -> Path:
    return get_config_dir() / "config.json"


def load_config() -> Dict[str, Any]:
    path = get_config_path()
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_config(data: Dict[str, Any]) -> None:
    path = get_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f)


def get_token() -> str | None:
    return load_config().get("token")


def set_token(token: str | None) -> None:
    cfg = load_config()
    if token is None:
        cfg.pop("token", None)
    else:
        cfg["token"] = token
    save_config(cfg)


def get_server_url() -> str:
    return load_config().get("server_url", _DEFAULT_SERVER_URL)


def set_server_url(url: str) -> None:
    cfg = load_config()
    cfg["server_url"] = url
    save_config(cfg)
