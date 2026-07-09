from sqlalchemy.orm import  Mapped, mapped_column, relationship 
from sqlalchemy import String, func, ForeignKey , DateTime , Integer , Enum , Index
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime , timezone
from typing import Optional
from app.core.database import Base
import enum

class DocumentStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    embedded = "embedded"
    failed = "failed"


class User(Base):
    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(100), unique=True)
    password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),  
    )

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    documents: Mapped[list["Document"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    token_usage: Mapped[list["TokenUsage"]] = relationship(back_populates="user" , cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id")) 

    user: Mapped["User"] = relationship(back_populates="conversations")
    
class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_user_created_id", "user_id", "created_at", "id"),
    )
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True) , primary_key=True , default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer , nullable=True)
    content_type: Mapped[str] = mapped_column(String(100))  
    s3_key: Mapped[str] = mapped_column(String(512), unique=True , nullable=True)    
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.uploaded
    )

    created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    server_default=func.now(),
     )
    
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id")) 
    user: Mapped["User"] = relationship(back_populates="documents")

  

class TokenUsage(Base):
    __tablename__ = "token_usage"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    tokens_used: Mapped[int] = mapped_column(Integer , default=0 , nullable=False)
    window_start: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
)
    user: Mapped["User"] = relationship(back_populates="token_usage")