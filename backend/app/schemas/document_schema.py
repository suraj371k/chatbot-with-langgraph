from pydantic import BaseModel , ConfigDict
from uuid import UUID
from app.models.models import DocumentStatus
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    id: UUID
    user_id: UUID
    filename: str
    content_type: str
    size: int
    status: DocumentStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_more: bool

