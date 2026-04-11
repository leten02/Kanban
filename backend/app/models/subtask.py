from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from app.models import Base


class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    is_completed = Column(Boolean, nullable=False, default=False, server_default="0")
    assignee_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
