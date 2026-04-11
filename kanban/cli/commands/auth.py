"""Auth commands: login, logout, whoami."""
from __future__ import annotations

import socket
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

import typer

from kanban import config
from kanban.cli.client import get_client
from kanban.cli.main import app


# ---------------------------------------------------------------------------
# Internal helpers (patchable in tests)
# ---------------------------------------------------------------------------

def _get_oauth_url(server_url: str, callback_port: int | None = None) -> str:
    """Call GET /auth/google/login and return the OAuth redirect URL."""
    import httpx
    params = {}
    if callback_port:
        params["callback_port"] = callback_port
    r = httpx.get(f"{server_url.rstrip('/')}/auth/google/login", params=params, follow_redirects=False)
    if r.status_code == 200:
        return r.json()["url"]
    if r.status_code in (302, 307):
        return r.headers["location"]
    typer.echo(f"Server error: {r.status_code}", err=True)
    raise typer.Exit(1)


def _run_local_callback(port: int = 0) -> dict[str, Any]:
    """Start a local HTTP server on the given port, wait for ?token=&name=&email= callback."""
    result: dict[str, Any] = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            result["token"] = params.get("token", [None])[0]
            result["name"] = params.get("name", [""])[0]
            result["email"] = params.get("email", [""])[0]
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Login successful. You can close this tab.")

        def log_message(self, *_):  # silence HTTP logs
            pass

    server = HTTPServer(("127.0.0.1", port), Handler)
    result["port"] = server.server_address[1]

    server.handle_request()
    server.server_close()
    return result


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

@app.command("login")
def login():
    """Open browser for Google sign-in and save your session locally."""
    server_url = config.get_server_url()

    # Pre-allocate a port so we can tell the OAuth backend where to redirect
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    callback_result: dict[str, Any] = {}
    ready = threading.Event()

    def _serve():
        data = _run_local_callback(port=port)
        callback_result.update(data)
        ready.set()

    t = threading.Thread(target=_serve, daemon=True)
    t.start()

    time.sleep(0.1)

    oauth_url = _get_oauth_url(server_url, callback_port=port)
    typer.echo("Opening browser for Google sign-in...")
    webbrowser.open(oauth_url)

    ready.wait(timeout=120)
    token = callback_result.get("token")
    if not token:
        typer.echo("Login timed out or failed.", err=True)
        raise typer.Exit(1)

    config.set_token(token)
    name = callback_result.get("name", "")
    email = callback_result.get("email", "")
    typer.echo(f"Logged in as {name} ({email})" if name else "Logged in successfully.")


@app.command("logout")
def logout():
    """Sign out and remove your saved session from this computer."""
    client = get_client()
    client.post("/auth/logout")
    config.set_token(None)
    typer.echo("You have been signed out.")


@app.command("whoami")
def whoami():
    """Show the name and email of the account you are currently signed in with."""
    if not config.get_token():
        typer.echo("You are not logged in. Run 'kanban login' first.", err=True)
        raise typer.Exit(1)
    client = get_client()
    data = client.get("/auth/me").json()
    typer.echo(f"Name:  {data.get('name', '')}")
    typer.echo(f"Email: {data.get('email', '')}")

