from datetime import datetime , timezone , timedelta
import jwt
from app.core.config import settings
from jwt.exceptions import InvalidTokenError
from fastapi import HTTPException , status
import bcrypt


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def create_access_token(data: dict ,expires_delta: timedelta=None ):
    to_encode = data.copy()
    if expires_delta:
       expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode ,settings.secret_key , algorithm=settings.algorithm )
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        return payload
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
