"""Room commands: list, reservations, book, cancel."""
from __future__ import annotations

from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app

console = Console()
room_app = typer.Typer(help="Book meeting rooms via GCS-PULSE.")
app.add_typer(room_app, name="room")


@room_app.command("list")
def list_rooms():
    """Show all available meeting rooms."""
    client = get_client()
    rooms = client.get("/meeting-rooms").json()

    table = Table("ID", "Name", "Location", "Description")
    for r in rooms:
        table.add_row(str(r["id"]), r["name"], r.get("location", ""), r.get("description", ""))
    console.print(table)


@room_app.command("reservations")
def reservations(
    room_id: int = typer.Argument(..., metavar="room-id"),
    date: str = typer.Argument(..., help="YYYY-MM-DD"),
):
    """Show existing bookings for a room on a given day."""
    client = get_client()
    data = client.get(f"/meeting-rooms/{room_id}/reservations", params={"date": date}).json()

    table = Table("Time", "Reserved by", "Purpose")
    for r in data:
        time_range = f"{r.get('start_at', '')} – {r.get('end_at', '')}"
        table.add_row(time_range, r.get("reserved_by", ""), r.get("purpose", ""))
    console.print(table)


@room_app.command("book")
def book(
    room_id: int = typer.Argument(..., metavar="room-id"),
    date: str = typer.Option(..., help="YYYY-MM-DD"),
    start: str = typer.Option(..., help="HH:MM"),
    end: str = typer.Option(..., help="HH:MM"),
    purpose: Optional[str] = typer.Option(None, help="What the meeting is for"),
    attendees: Optional[str] = typer.Option(None, help="Comma-separated email addresses"),
):
    """Reserve a meeting room and create a Google Calendar event."""
    payload: dict = {"start_at": f"{date}T{start}:00", "end_at": f"{date}T{end}:00"}
    if purpose:
        payload["purpose"] = purpose
    if attendees:
        payload["attendee_emails"] = [e.strip() for e in attendees.split(",")]

    client = get_client()
    data = client.post(f"/meeting-rooms/{room_id}/reservations", json=payload).json()
    typer.echo(f"Room booked! Reservation ID: {data['id']}")
    if data.get("google_calendar_event_id"):
        n = len(data.get("attendee_emails") or [])
        typer.echo(f"Google Calendar event created. Invites sent to {n} attendees.")


@room_app.command("cancel")
def cancel(reservation_id: int = typer.Argument(..., metavar="reservation-id")):
    """Cancel an existing room reservation and delete the Calendar event."""
    confirmed = typer.confirm("Are you sure you want to cancel this reservation?")
    if not confirmed:
        return
    client = get_client()
    client.delete(f"/meeting-rooms/reservations/{reservation_id}")
    typer.echo("Reservation cancelled. Google Calendar event deleted.")
