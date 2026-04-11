"""Google Calendar API integration."""
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings


def create_meeting_event(
    refresh_token: str,
    title: str,
    start_dt: str,  # ISO 8601, e.g. "2026-04-11T09:00:00"
    end_dt: str,
    attendee_emails: list[str],
    description: str = "",
    location: str = "",
) -> dict:
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    event = {
        "summary": title,
        "description": description,
        "location": location,
        "start": {"dateTime": start_dt, "timeZone": "Asia/Seoul"},
        "end": {"dateTime": end_dt, "timeZone": "Asia/Seoul"},
        "attendees": [{"email": email} for email in attendee_emails],
    }
    return (
        service.events()
        .insert(calendarId="primary", body=event, sendUpdates="all")
        .execute()
    )
