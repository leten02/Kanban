"""HTTP client for the kanban CLI.

Wraps httpx.Client with:
- Automatic server_url + token loading from ~/.kanban/config.json
- Authorization: Bearer header injection
- Consistent error handling (401 → auth prompt, 4xx/5xx → error message)
"""
from __future__ import annotations

from typing import Any

import httpx
import typer

from kanban import config as cfg


class KanbanHTTPError(Exception):
    pass


class APIClient:
    def __init__(self, base_url: str | None = None, token: str | None = None):
        self._base_url = base_url or cfg.get_server_url()
        self._token = token if token is not None else cfg.get_token()

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Accept": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    def _handle_response(self, response: httpx.Response) -> httpx.Response:
        if response.status_code == 401:
            typer.echo("You are not logged in. Run 'kanban login' first.", err=True)
            raise typer.Exit(1)
        if response.status_code == 404:
            typer.echo("Not found.", err=True)
            raise typer.Exit(1)
        if response.status_code >= 400:
            try:
                detail = response.json().get("detail", response.text)
            except Exception:
                detail = response.text
            typer.echo(f"Error {response.status_code}: {detail}", err=True)
            raise typer.Exit(1)
        return response

    def get(self, path: str, **kwargs: Any) -> httpx.Response:
        url = self._base_url.rstrip("/") + path
        r = httpx.get(url, headers=self._headers(), **kwargs)
        return self._handle_response(r)

    def post(self, path: str, json: Any = None, **kwargs: Any) -> httpx.Response:
        url = self._base_url.rstrip("/") + path
        r = httpx.post(url, headers=self._headers(), json=json, **kwargs)
        return self._handle_response(r)

    def patch(self, path: str, json: Any = None, **kwargs: Any) -> httpx.Response:
        url = self._base_url.rstrip("/") + path
        r = httpx.patch(url, headers=self._headers(), json=json, **kwargs)
        return self._handle_response(r)

    def delete(self, path: str, **kwargs: Any) -> httpx.Response:
        url = self._base_url.rstrip("/") + path
        r = httpx.delete(url, headers=self._headers(), **kwargs)
        return self._handle_response(r)


def get_client() -> APIClient:
    """Return a configured APIClient. Import and monkeypatch this in tests."""
    return APIClient()
