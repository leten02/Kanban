from fastapi import Cookie, Header, Depends, HTTPException, status
from itsdangerous import URLSafeTimedSerializer, BadSignature
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User


async def get_current_user(
    authorization: str | None = Header(default=None),
    session_user_id: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = None

    if authorization and authorization.startswith("Bearer "):
        raw = authorization.removeprefix("Bearer ").strip()
        try:
            s = URLSafeTimedSerializer(settings.secret_key, salt="cli-token")
            user_id = int(s.loads(raw, max_age=365 * 24 * 3600))
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if user_id is None and session_user_id:
        try:
            user_id = int(session_user_id)
        except (ValueError, TypeError):
            pass

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user
