from app.core.security import decode_access_token
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import decode_access_token
from app.dependencies.get_db import get_db
from app.models.models import User
from fastapi import Cookie , Depends , HTTPException , status

async def get_current_user(token: str = Cookie(None) , db: AsyncSession = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED , detail="Not logged in")
    
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user