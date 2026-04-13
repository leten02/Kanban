from fastapi import Cookie, Header, Depends, HTTPException, status
from itsdangerous import URLSafeTimedSerializer, BadSignature
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

_SESSION_SALT = "web-session"
_SESSION_MAX_AGE = 30 * 24 * 3600  # 30일


def make_session_cookie(user_id: int) -> str:
    """서명된 세션 쿠키 값을 생성합니다."""
    s = URLSafeTimedSerializer(settings.secret_key, salt=_SESSION_SALT)
    return s.dumps(str(user_id))


def _parse_session_cookie(value: str) -> int | None:
    """서명된 쿠키 값을 검증하고 user_id를 반환합니다. 유효하지 않으면 None."""
    try:
        s = URLSafeTimedSerializer(settings.secret_key, salt=_SESSION_SALT)
        return int(s.loads(value, max_age=_SESSION_MAX_AGE))
    except Exception:
        return None


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
        user_id = _parse_session_cookie(session_user_id)

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


async def require_project_member(
    project_id: int,
    current_user: User,
    db: AsyncSession,
) -> None:
    """프로젝트 생성자이거나 프로젝트 멤버가 아닌 경우 403을 반환합니다."""
    from app.models.project import Project
    from app.models.project_member import ProjectMember

    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.created_by_user_id == current_user.id:
        return

    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.email == current_user.email,
        )
    )
    if member_result.scalar_one_or_none() is not None:
        return

    raise HTTPException(status_code=403, detail="이 프로젝트에 접근할 권한이 없습니다.")
