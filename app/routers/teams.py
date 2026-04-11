import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(tags=["teams"])


def _gcs_headers() -> dict:
    return {"Authorization": f"Bearer {settings.gcs_pulse_token}"}


@router.get("/teams/me")
async def get_my_team(current_user: User = Depends(get_current_user)):
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{settings.gcs_pulse_base_url}/teams/me",
            headers=_gcs_headers(),
            timeout=10,
        )
        if r.status_code == 404:
            raise HTTPException(status_code=404, detail="Team not found")
        if r.status_code >= 500:
            raise HTTPException(status_code=502, detail="GCS-PULSE unavailable")
        r.raise_for_status()

    data = r.json()
    team = data.get("team")
    if team is None:
        raise HTTPException(status_code=404, detail="You are not in a team")

    # Flatten TeamMeResponse → TeamResponse so the CLI can access fields directly
    return team
