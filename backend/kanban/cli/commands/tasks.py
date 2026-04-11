"""Task commands: list, create, update, move, delete."""
from __future__ import annotations

from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app

console = Console()
task_app = typer.Typer(help="Manage tasks (kanban cards / WBS Level 2).")
app.add_typer(task_app, name="task")

_STATUS_LABELS = {
    "todo": "Todo",
    "in_progress": "In Progress",
    "in_review": "In Review",
    "done": "Done",
}


@task_app.command("list")
def list_tasks(
    project_id: int = typer.Argument(..., metavar="project-id"),
    status: Optional[str] = typer.Option(None, help="Filter: todo, in_progress, in_review, done"),
):
    """Show all tasks in a project."""
    client = get_client()
    params = {}
    if status:
        params["status"] = status
    tasks = client.get(f"/projects/{project_id}/tasks", params=params).json()

    table = Table("ID", "Title", "Assignee", "Priority", "Due Date")
    for t in tasks:
        table.add_row(
            str(t["id"]),
            t["title"],
            t.get("assignee") or "—",
            t.get("priority", ""),
            (t.get("due_date") or "")[:10],
        )
    console.print(table)


@task_app.command("create")
def create(
    epic_id: int = typer.Argument(..., metavar="epic-id"),
    title: str = typer.Option(..., help="The name of this task"),
    description: Optional[str] = typer.Option(None),
    assignee_id: Optional[int] = typer.Option(None, help="User ID of the assignee"),
    priority: Optional[str] = typer.Option(None, help="low, medium, or high (default: medium)"),
    due_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD"),
):
    """Create a new task inside an epic."""
    payload: dict = {"title": title}
    if description is not None:
        payload["description"] = description
    if assignee_id is not None:
        payload["assignee_user_id"] = assignee_id
    if priority is not None:
        payload["priority"] = priority
    if due_date is not None:
        payload["due_date"] = due_date

    client = get_client()
    data = client.post(f"/epics/{epic_id}/tasks", json=payload).json()
    typer.echo(f"Task created! ID: {data['id']}")


@task_app.command("update")
def update(
    task_id: int = typer.Argument(..., metavar="id"),
    title: Optional[str] = typer.Option(None),
    description: Optional[str] = typer.Option(None),
    assignee_id: Optional[int] = typer.Option(None, help="User ID (use 0 to remove)"),
    priority: Optional[str] = typer.Option(None, help="low, medium, or high"),
    due_date: Optional[str] = typer.Option(None, help="YYYY-MM-DD"),
):
    """Change details of an existing task."""
    payload: dict = {}
    if title is not None:
        payload["title"] = title
    if description is not None:
        payload["description"] = description
    if assignee_id is not None:
        payload["assignee_user_id"] = assignee_id
    if priority is not None:
        payload["priority"] = priority
    if due_date is not None:
        payload["due_date"] = due_date

    if not payload:
        typer.echo("Provide at least one field to update.", err=True)
        raise typer.Exit(1)
    client = get_client()
    client.patch(f"/tasks/{task_id}", json=payload)
    typer.echo("Task updated.")


@task_app.command("move")
def move(
    task_id: int = typer.Argument(..., metavar="id"),
    status: str = typer.Argument(..., help="todo, in_progress, in_review, or done"),
):
    """Move a task to a different kanban column."""
    client = get_client()
    client.patch(f"/tasks/{task_id}/status", json={"status": status})
    label = _STATUS_LABELS.get(status, status)
    typer.echo(f'Task moved to "{label}".')


@task_app.command("delete")
def delete(task_id: int = typer.Argument(..., metavar="id")):
    """Permanently remove a task and all of its subtasks."""
    client = get_client()
    t = client.get(f"/tasks/{task_id}").json()
    confirmed = typer.confirm(f'Are you sure you want to delete "{t["title"]}"?')
    if not confirmed:
        return
    client.delete(f"/tasks/{task_id}")
    typer.echo("Task deleted.")
