from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func

from app.models import Base


class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
