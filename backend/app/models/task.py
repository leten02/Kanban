from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, CheckConstraint, func
from app.models import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    epic_id = Column(Integer, ForeignKey("epics.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default="todo", server_default="todo")
    priority = Column(String, nullable=False, default="medium", server_default="medium")
    assignee_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assignee_member_id = Column(Integer, ForeignKey("project_members.id", ondelete="SET NULL"), nullable=True)
    assignee_name = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    display_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('todo','in_progress','in_review','done')", name="ck_tasks_status"
        ),
        CheckConstraint("priority IN ('low','medium','high')", name="ck_tasks_priority"),
    )
