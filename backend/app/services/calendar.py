"""Google Calendar service — create/delete events using a user's refresh token."""
import asyncio

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings
from app.core.security import decrypt


def _get_calendar_service(encrypted_refresh_token: str):
    refresh_token = decrypt(encrypted_refresh_token)
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


async def create_calendar_event(
    encrypted_refresh_token: str,
    summary: str,
    start_at: str,
    end_at: str,
    attendee_emails: list[str],
    description: str = "",
    timezone: str = "Asia/Seoul",
) -> str:
    """Create a Google Calendar event and return the event ID."""
    service = _get_calendar_service(encrypted_refresh_token)
    event = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_at, "timeZone": timezone},
        "end": {"dateTime": end_at, "timeZone": timezone},
        "attendees": [{"email": e} for e in attendee_emails],
        "sendUpdates": "all",
    }
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: service.events()
        .insert(calendarId="primary", body=event, sendNotifications=True)
        .execute(),
    )
    return result["id"]


async def delete_calendar_event(encrypted_refresh_token: str, event_id: str) -> None:
    service = _get_calendar_service(encrypted_refresh_token)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: service.events()
        .delete(calendarId="primary", eventId=event_id, sendUpdates="all")
        .execute(),
    )
