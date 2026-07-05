from pydantic import BaseModel , Field , EmailStr
import uuid

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
    
    model_config = {"from_attributes": True} 