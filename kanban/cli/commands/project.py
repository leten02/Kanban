"""Project commands: list, create, show, update, delete."""
from __future__ import annotations

from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app

console = Console()
project_app = typer.Typer(help="Manage projects.")
app.add_typer(project_app, name="project")


@project_app.command("list")
def list_projects():
    """Show all projects on the server."""
    client = get_client()
    projects = client.get("/projects").json()

    table = Table("ID", "Name", "Created")
    for p in projects:
        table.add_row(str(p["id"]), p["name"], p.get("created_at", "")[:10])
    console.print(table)


@project_app.command("create")
def create(
    name: str = typer.Option(..., help="The name of the project"),
    description: Optional[str] = typer.Option(None, help="A short description"),
):
    """Creates a new project."""
    client = get_client()
    data = client.post("/projects", json={"name": name, "description": description}).json()
    typer.echo(f"Project created! ID: {data['id']}")


@project_app.command("show")
def show(project_id: int = typer.Argument(..., metavar="id")):
    """Show details of one project."""
    client = get_client()
    p = client.get(f"/projects/{project_id}").json()
    typer.echo(f"ID:          {p['id']}")
    typer.echo(f"Name:        {p['name']}")
    typer.echo(f"Description: {p.get('description') or ''}")
    typer.echo(f"Created:     {(p.get('created_at') or '')[:10]}")


@project_app.command("update")
def update(
    project_id: int = typer.Argument(..., metavar="id"),
    name: Optional[str] = typer.Option(None, help="New project name"),
    description: Optional[str] = typer.Option(None, help="New description"),
):
    """Change the name or description of an existing project."""
    payload = {k: v for k, v in {"name": name, "description": description}.items() if v is not None}
    if not payload:
        typer.echo("Provide at least --name or --description.", err=True)
        raise typer.Exit(1)
    client = get_client()
    client.patch(f"/projects/{project_id}", json=payload)
    typer.echo("Project updated.")


@project_app.command("delete")
def delete(project_id: int = typer.Argument(..., metavar="id")):
    """Permanently delete a project and all its contents."""
    client = get_client()
    p = client.get(f"/projects/{project_id}").json()
    confirmed = typer.confirm(
        f'Are you sure you want to delete "{p["name"]}"? '
        "This will also delete all epics, tasks, and subtasks inside it."
    )
    if not confirmed:
        return
    client.delete(f"/projects/{project_id}")
    typer.echo("Project deleted.")
