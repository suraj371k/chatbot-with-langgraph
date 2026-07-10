from pydantic import BaseModel , Field , EmailStr
import uuid
from datetime import datetime

class SignupInput(BaseModel):
    name: str = Field(min_length=3 , max_length=50)
    email: EmailStr
    password: str = Field(min_length=6 , max_length=15)

class LoginInput(BaseModel):
    email: EmailStr
    password: str
    
class AuthResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    created_at: datetime
    
    model_config = {"from_attributes": True} 