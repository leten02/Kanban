"""Notify commands: list, read, stream."""
from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app
from kanban import config

console = Console()
notify_app = typer.Typer(help="Manage notifications from GCS-PULSE.")
app.add_typer(notify_app, name="notify")


def _stream_sse(server_url: str, token: str | None) -> None:
    """Connect to SSE endpoint and print notifications as they arrive."""
    import httpx

    headers = {"Accept": "text/event-stream"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = server_url.rstrip("/") + "/notifications/sse"
    typer.echo("Connected. Watching for new notifications... (Ctrl+C to stop)")

    with httpx.stream("GET", url, headers=headers, timeout=None) as r:
        for line in r.iter_lines():
            if line.startswith("data:"):
                message = line[5:].strip()
                if message:
                    typer.echo(message)


@notify_app.command("list")
def list_notifications(
    limit: int = typer.Option(20, help="How many notifications to show (max: 100)"),
):
    """Show your most recent notifications."""
    client = get_client()
    notifications = client.get("/notifications", params={"limit": limit}).json()

    table = Table("ID", "Read?", "Message", "Time")
    for n in notifications:
        read_label = "Yes" if n.get("is_read") else "No"
        table.add_row(
            str(n["id"]),
            read_label,
            n.get("message", ""),
            n.get("created_at", ""),
        )
    console.print(table)


@notify_app.command("read")
def read(notification_id: int = typer.Argument(..., metavar="id")):
    """Mark a notification as read."""
    client = get_client()
    client.patch(f"/notifications/{notification_id}/read")
    typer.echo("Notification marked as read.")


@notify_app.command("stream")
def stream():
    """Connect to the server and show notifications in real time."""
    try:
        _stream_sse(config.get_server_url(), config.get_token())
    except KeyboardInterrupt:
        typer.echo("\nDisconnected.")
