"""Epic commands: list, create, update, delete."""
from __future__ import annotations

from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app

console = Console()
epic_app = typer.Typer(help="Manage epics (WBS Level 1).")
app.add_typer(epic_app, name="epic")


@epic_app.command("list")
def list_epics(project_id: int = typer.Argument(..., metavar="project-id")):
    """Show all epics in a project with progress."""
    client = get_client()
    epics = client.get(f"/projects/{project_id}/epics").json()

    table = Table("ID", "Title", "Status", "Progress", "Due Date")
    for e in epics:
        progress = e.get("progress", 0)
        table.add_row(
            str(e["id"]),
            e["title"],
            e.get("status", ""),
            f"{progress}%",
            (e.get("end_date") or "")[:10],
        )
    console.print(table)


@epic_app.command("create")
def create(
    project_id: int = typer.Argument(..., metavar="project-id"),
    title: str = typer.Option(..., help="The name of this epic"),
    description: Optional[str] = typer.Option(None),
    start_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD"),
    end_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD"),
):
    """Add a new epic to a project."""
    payload = {"title": title}
    if description is not None:
        payload["description"] = description
    if start_date is not None:
        payload["start_date"] = start_date
    if end_date is not None:
        payload["end_date"] = end_date

    client = get_client()
    data = client.post(f"/projects/{project_id}/epics", json=payload).json()
    typer.echo(f"Epic created! ID: {data['id']}")


@epic_app.command("update")
def update(
    epic_id: int = typer.Argument(..., metavar="id"),
    title: Optional[str] = typer.Option(None),
    description: Optional[str] = typer.Option(None),
    status: Optional[str] = typer.Option(None, help="todo, in_progress, or done"),
    start_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD"),
    end_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD"),
):
    """Change the details of an existing epic."""
    payload = {k: v for k, v in {
        "title": title, "description": description,
        "status": status, "start_date": start_date, "end_date": end_date,
    }.items() if v is not None}
    if not payload:
        typer.echo("Provide at least one field to update.", err=True)
        raise typer.Exit(1)
    client = get_client()
    client.patch(f"/epics/{epic_id}", json=payload)
    typer.echo("Epic updated.")


@epic_app.command("delete")
def delete(epic_id: int = typer.Argument(..., metavar="id")):
    """Permanently remove an epic and all tasks and subtasks inside it."""
    client = get_client()
    e = client.get(f"/epics/{epic_id}").json()
    confirmed = typer.confirm(f'Are you sure you want to delete "{e["title"]}"?')
    if not confirmed:
        return
    client.delete(f"/epics/{epic_id}")
    typer.echo("Epic deleted.")
