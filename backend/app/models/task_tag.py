from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.models import Base


class TaskTag(Base):
    __tablename__ = "task_tags"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    tag = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("task_id", "tag"),)
