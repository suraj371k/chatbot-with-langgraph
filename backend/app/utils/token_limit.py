from datetime import datetime , timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import  status , HTTPException
from sqlalchemy import select
from app.models.models import TokenUsage
from datetime import datetime , timezone , timedelta
from app.dependencies.get_db import get_db

DAILY_TOKEN_LIMIT=20000
WINDOW = timedelta(hours=24)

async def check_and_reverse_token(db: AsyncSession , user_id: str , estimated_token: int) -> TokenUsage:
    
    stmt = await db.execute(select(TokenUsage).where(TokenUsage.user_id == user_id).with_for_update())
    row = stmt.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if row is None:
        row = TokenUsage(user_id=user_id , tokens_used=0 , window_start=now)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    
    # reset window if 24 hours have passed since started
    if now - row.window_start >= WINDOW:
        row.tokens_used = 0
        row.window_start = now
        
    if row.tokens_used + estimated_token > DAILY_TOKEN_LIMIT:
        remaining_seconds = (row.window_start + WINDOW - now).total_seconds()
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Daily token limit reached",
                "limit": DAILY_TOKEN_LIMIT,
                "used": row.tokens_used,
                "reset_in_seconds": max(0 , int(remaining_seconds))
            }
        )
    
    return row

async def record_tokens(db: AsyncSession , row: TokenUsage , actual_token: int):
    row.tokens_used += actual_token
    await db.commit()
        
        
