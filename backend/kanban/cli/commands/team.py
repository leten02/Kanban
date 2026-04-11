"""Team command: show."""
import typer
from rich.console import Console
from rich.table import Table

from kanban.cli.client import get_client
from kanban.cli.main import app

console = Console()
team_app = typer.Typer(help="View your team information from GCS-PULSE.")
app.add_typer(team_app, name="team")


@team_app.command("show")
def show():
    """Show your team members (pulled from GCS-PULSE)."""
    client = get_client()
    data = client.get("/teams/me").json()

    typer.echo(f"Team: {data.get('name', '')}\n")
    table = Table("ID", "Name", "Email")
    for m in data.get("members", []):
        table.add_row(str(m["id"]), m["name"], m["email"])
    console.print(table)
