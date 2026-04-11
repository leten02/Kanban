from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from app.models import Base


class MeetingReservation(Base):
    __tablename__ = "meeting_reservations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    gcs_reservation_id = Column(Integer, unique=True, nullable=False)
    gcs_room_id = Column(Integer, nullable=False)
    reserved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    purpose = Column(String, nullable=True)
    attendee_emails = Column(String, nullable=True)  # JSON array as string
    google_calendar_event_id = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
