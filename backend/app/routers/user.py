from fastapi import APIRouter, Depends
from app.dependencies.get_user import get_current_user
from app.schemas.auth_schema import AuthResponse
from app.models.models import User

router = APIRouter()

@router.get('/profile', tags=["user"], response_model=AuthResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return AuthResponse.model_validate(current_user)