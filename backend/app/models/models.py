from sqlalchemy.orm import  Mapped, mapped_column, relationship 
from sqlalchemy import String, func, ForeignKey , DateTime , Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime , timezone
from typing import Optional
from app.core.database import Base

class User(Base):
    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(100), unique=True)
    password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )

class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(insert_default=func.now())

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id")) 

    user: Mapped["User"] = relationship(back_populates="conversations")
  

class TokenUsage(Base):
    __tablename__ = "token_usage"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    tokens_used: Mapped[int] = mapped_column(Integer , default=0 , nullable=False)
    window_start: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
)