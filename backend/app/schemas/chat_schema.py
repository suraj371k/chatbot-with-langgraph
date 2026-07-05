from pydantic import BaseModel
from typing import Literal, Optional
from uuid import UUID
from datetime import datetime


class ChatInput(BaseModel):
    question: str
    conversation_id: UUID | None = None 


class ChatMessage(BaseModel):
    role: Literal["assistant", "user"]
    content: str


class ChatResponse(BaseModel):
    content: str
    conversation_id: UUID


class ChatHistoryResponse(BaseModel):
    conversation_id: UUID
    user_id: UUID
    conversation_name: str
    messages: list[ChatMessage]


class ConversationSummary(BaseModel):
    conversation_id: UUID
    name: Optional[str] = None
    created_at: datetime


class ConversationListResponse(BaseModel):
    conversations: list[ConversationSummary]
    
class UpdateTitleRequest(BaseModel):
    title: str
