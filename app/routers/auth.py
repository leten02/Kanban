from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.config import settings
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


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
async def google_login(request: Request):
    oauth = _get_oauth_client()
    redirect_uri = settings.google_redirect_uri
    # Build the authorization URL without actually redirecting
    google = oauth.create_client("google")
    # We generate the URL manually so we can return JSON
    url, _ = google.create_authorization_url(redirect_uri)
    return {"url": url}


@router.get("/google/callback", response_model=UserOut)
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    oauth = _get_oauth_client()
    google = oauth.create_client("google")
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

    response = Response(content=UserOut.model_validate(user).model_dump_json(), media_type="application/json")
    response.set_cookie("session_user_id", str(user.id), httponly=True, samesite="lax")
    return response


@router.post("/logout")
async def logout():
    response = Response(content='{"message": "Logged out"}', media_type="application/json")
    response.delete_cookie("session_user_id")
    return response


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
