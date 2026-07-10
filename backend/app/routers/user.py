from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.dependencies.get_user import get_current_user
from app.dependencies.get_db import get_db
from app.schemas.auth_schema import AuthResponse
from app.models.models import User, TokenUsage
from app.utils.token_limit import DAILY_TOKEN_LIMIT, WINDOW

router = APIRouter()

@router.get('/profile', tags=["user"], response_model=AuthResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return AuthResponse.model_validate(current_user)


@router.get('/usage', tags=["user"])
async def get_token_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Read-only view of the current 24h token usage window, for dashboard display.
    Does not mutate the row — the actual reset/increment happens in
    app.utils.token_limit during chat requests."""
    result = await db.execute(select(TokenUsage).where(TokenUsage.user_id == current_user.id))
    row = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if row is None:
        return {
            "tokens_used": 0,
            "limit": DAILY_TOKEN_LIMIT,
            "remaining": DAILY_TOKEN_LIMIT,
            "percentage_used": 0.0,
            "reset_in_seconds": int(WINDOW.total_seconds()),
        }

    window_start = row.window_start
    if window_start.tzinfo is None:
        window_start = window_start.replace(tzinfo=timezone.utc)

    elapsed = now - window_start
    if elapsed >= WINDOW:
        tokens_used = 0
        reset_in_seconds = int(WINDOW.total_seconds())
    else:
        tokens_used = row.tokens_used
        reset_in_seconds = max(int((window_start + WINDOW - now).total_seconds()), 0)

    return {
        "tokens_used": tokens_used,
        "limit": DAILY_TOKEN_LIMIT,
        "remaining": max(DAILY_TOKEN_LIMIT - tokens_used, 0),
        "percentage_used": round(min(tokens_used / DAILY_TOKEN_LIMIT, 1.0) * 100, 1),
        "reset_in_seconds": reset_in_seconds,
    }
