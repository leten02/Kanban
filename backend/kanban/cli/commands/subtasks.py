"""Subtask commands: list, create, update, done, delete."""
from __future__ import annotations

from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app

console = Console()
subtask_app = typer.Typer(help="Manage subtasks (checklist / WBS Level 3).")
app.add_typer(subtask_app, name="subtask")


@subtask_app.command("list")
def list_subtasks(task_id: int = typer.Argument(..., metavar="task-id")):
    """Show all subtasks for a task."""
    client = get_client()
    subtasks = client.get(f"/tasks/{task_id}/subtasks").json()

    table = Table("ID", "Title", "Done?", "Assignee")
    for s in subtasks:
        done = "Yes" if s.get("is_completed") else "No"
        table.add_row(str(s["id"]), s["title"], done, s.get("assignee") or "—")
    console.print(table)


@subtask_app.command("create")
def create(
    task_id: int = typer.Argument(..., metavar="task-id"),
    title: str = typer.Option(..., help="What needs to be done"),
    assignee_id: Optional[int] = typer.Option(None, help="User ID of the assignee"),
):
    """Add a new subtask to a task."""
    payload: dict = {"title": title}
    if assignee_id is not None:
        payload["assignee_user_id"] = assignee_id

    client = get_client()
    data = client.post(f"/tasks/{task_id}/subtasks", json=payload).json()
    typer.echo(f"Subtask created! ID: {data['id']}")


@subtask_app.command("update")
def update(
    subtask_id: int = typer.Argument(..., metavar="id"),
    title: Optional[str] = typer.Option(None),
    assignee_id: Optional[int] = typer.Option(None, help="New assignee user ID"),
):
    """Change the title or assignee of an existing subtask."""
    payload = {k: v for k, v in {"title": title, "assignee_user_id": assignee_id}.items() if v is not None}
    if not payload:
        typer.echo("Provide at least --title or --assignee-id.", err=True)
        raise typer.Exit(1)
    client = get_client()
    client.patch(f"/subtasks/{subtask_id}", json=payload)
    typer.echo("Subtask updated.")


@subtask_app.command("done")
def done(subtask_id: int = typer.Argument(..., metavar="id")):
    """Mark a subtask as completed."""
    client = get_client()
    data = client.patch(f"/subtasks/{subtask_id}", json={"is_completed": True}).json()
    progress = data.get("task_progress")
    if progress is not None:
        typer.echo(f"Subtask marked as done. (Task progress: {progress}%)")
    else:
        typer.echo("Subtask marked as done.")


@subtask_app.command("delete")
def delete(subtask_id: int = typer.Argument(..., metavar="id")):
    """Permanently remove a subtask."""
    client = get_client()
    client.delete(f"/subtasks/{subtask_id}")
    typer.echo("Subtask deleted.")
