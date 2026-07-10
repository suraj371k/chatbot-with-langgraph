from fastapi import APIRouter, Depends, HTTPException, status , Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies.get_db import get_db
from app.schemas.auth_schema import SignupInput, AuthResponse , LoginInput
from app.models.models import User
from app.core.security import get_password_hash , verify_password , create_access_token
from datetime import timedelta
from app.core.config import settings
from fastapi_throttle import RateLimiter

router = APIRouter()

limiter = RateLimiter(times=10 , seconds=60)

@router.post('/signup', dependencies=[Depends(limiter)], response_model=AuthResponse, status_code=status.HTTP_201_CREATED , tags=["auth"])
async def signup(data: SignupInput, db: AsyncSession = Depends(get_db)):

    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(data.password)

    user = User(
        name=data.name,
        email=data.email,
        password=hashed_password
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return AuthResponse.model_validate(user)

@router.post('/login' ,dependencies=[Depends(limiter)], status_code=status.HTTP_200_OK , tags=["auth"])
async def login(response:Response, data: LoginInput , db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND , detail="user not found")
    
    if not verify_password(data.password ,  user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST , detail="Invalid credentials")
    
    token_expiry = timedelta(minutes=settings.access_token_expiry_time)
    token = create_access_token(data={"sub":str(user.id)} , expires_delta=token_expiry)
    
    response.set_cookie(
        key="token",
        value=token,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
        path="/",
        max_age=int(token_expiry.total_seconds())
    )
    return AuthResponse.model_validate(user) 


@router.post('/logout' , tags=["auth"])
async def  logout(response: Response):
    response.delete_cookie(
        key="token",
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return {"message": "Logged out successfully"}