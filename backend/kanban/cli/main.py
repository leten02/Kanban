import typer

app = typer.Typer(help="Kanban CLI")

# Import command modules after app creation so commands can import app safely
from . import commands  # noqa: F401


def main() -> None:
    """Entry point for console_scripts and local invocation."""
    app()


if __name__ == "__main__":
    main()
