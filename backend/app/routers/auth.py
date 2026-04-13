import time
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Response
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.core.database import get_db
from app.core.security import encrypt
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_bearer_token(user_id: int) -> str:
    signer = URLSafeTimedSerializer(settings.secret_key, salt="cli-token")
    return signer.dumps(str(user_id))


def _get_oauth_client():
    from authlib.integrations.starlette_client import OAuth
    oauth = OAuth()
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={
            "scope": (
                "openid email profile "
                "https://www.googleapis.com/auth/calendar"
            )
        },
    )
    return oauth


@router.get("/google/login")
async def google_login(
    request: Request,
    callback_port: int | None = None,
    callback_url: str | None = None,
):
    oauth = _get_oauth_client()
    redirect_uri = settings.google_redirect_uri
    google = oauth.create_client("google")

    extra = {}
    if callback_port:
        extra["state"] = f"port:{callback_port}"
    elif callback_url:
        extra["state"] = f"url:{callback_url}"

    # authorize_redirect: stores state in session and redirects to Google
    # This keeps the session cookie on the 8000 domain so callback can verify state
    return await google.authorize_redirect(request, redirect_uri, **extra)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    oauth = _get_oauth_client()
    google = oauth.create_client("google")

    # Railway's reverse proxy can drop session cookies between login→callback.
    # Re-inject the state from the query param so Authlib's CSRF check passes.
    # authlib's get_state_data reads session[key]["data"], so we must match that format.
    state = request.query_params.get("state", "")
    if state:
        request.session[f"_state_google_{state}"] = {
            "data": {"redirect_uri": settings.google_redirect_uri},
            "exp": time.time() + 300,
        }

    token = await google.authorize_access_token(request)

    userinfo = token.get("userinfo") or await google.userinfo(token=token)

    google_id = userinfo["sub"]
    email = userinfo.get("email", "")
    name = userinfo.get("name", "")
    picture = userinfo.get("picture")
    refresh_token_raw = token.get("refresh_token")

    from app.core.security import encrypt

    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
            google_refresh_token=encrypt(refresh_token_raw) if refresh_token_raw else None,
        )
        db.add(user)
    else:
        user.email = email
        user.name = name
        user.picture = picture
        if refresh_token_raw:
            user.google_refresh_token = encrypt(refresh_token_raw)

    await db.commit()
    await db.refresh(user)

    bearer_token = _make_bearer_token(user.id)

    # Redirect to CLI local server if callback_port was embedded in state
    state = request.query_params.get("state", "")
    if state.startswith("port:"):
        try:
            port = int(state.split(":", 1)[1])
            params = urllib.parse.urlencode({"token": bearer_token, "name": name, "email": email})
            return RedirectResponse(f"http://127.0.0.1:{port}/?{params}")
        except (ValueError, IndexError):
            pass

    # Web frontend: redirect with token to callback_url embedded in state
    if state.startswith("url:"):
        frontend_url = state[4:]
        params = urllib.parse.urlencode({"token": bearer_token})
        return RedirectResponse(f"{frontend_url}?{params}")

    # Browser-based login: set cookie and return user info
    from fastapi.responses import JSONResponse
    response = JSONResponse(content={"id": user.id, "name": name, "email": email, "picture": picture})
    response.set_cookie("session_user_id", str(user.id), httponly=True, samesite="lax")
    return response


from pydantic import BaseModel


class SchoolLinkRequest(BaseModel):
    api_token: str


@router.post("/1000school/link")
async def link_school(
    req: SchoolLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """1000school API 토큰 검증 후 DB 저장"""
    import httpx

    SCHOOL_API = "https://api.1000.school"

    async with httpx.AsyncClient() as client:
        # 토큰 유효성 검증
        r = await client.get(
            f"{SCHOOL_API}/auth/me",
            headers={"Authorization": f"Bearer {req.api_token}"},
        )
        if r.status_code != 200:
            raise HTTPException(400, "유효하지 않은 1000school API 토큰입니다.")

    current_user.school_api_token = encrypt(req.api_token)
    await db.commit()

    return {"ok": True, "has_school_token": True}


@router.post("/logout")
async def logout():
    response = Response(content='{"message": "Logged out"}', media_type="application/json")
    response.delete_cookie("session_user_id")
    return response


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/token")
async def get_token(current_user: User = Depends(get_current_user)):
    """Generate a signed Bearer token for an already-authenticated (cookie) session."""
    return {"token": _make_bearer_token(current_user.id)}
