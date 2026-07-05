from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies.get_db import get_db
from app.dependencies.get_user import get_current_user
from fastapi import Depends
from app.utils.token_limit import check_and_reverse_token

async def enforce_token_limit(estimated_tokens: int = 500 , db: AsyncSession = Depends(get_db) , current_user= Depends(get_current_user)):
    usage_row = await check_and_reverse_token(db, current_user.id, estimated_tokens)
    return usage_row