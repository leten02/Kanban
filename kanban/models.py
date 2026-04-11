from sqlalchemy import Table, Column, Integer, String, MetaData, DateTime
from sqlalchemy.sql import func

metadata = MetaData()

Project = Table(
    "projects",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String, nullable=False),
    Column("created_at", DateTime, server_default=func.now()),
)

# helper to create tables using an async connection
async def create_tables(conn):
    await conn.run_sync(metadata.create_all)
