import uuid
import boto3
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from app.dependencies.get_db import get_db
from app.dependencies.get_user import get_current_user
from app.core.config import settings
from app.models.models import Document, DocumentStatus

router = APIRouter()

s3 = boto3.client("s3", region_name=settings.bucket_region)

ALLOWED_EXTENSIONS = (".pdf", ".doc", ".docx")


@router.post("/upload", tags=["documents"])
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="File type not allowed")

    s3_key = f"{uuid.uuid4()}_{file.filename}"

    try:
        await run_in_threadpool(s3.upload_fileobj, file.file, settings.bucket_name, s3_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    document = Document(
        filename=file.filename,
        s3_key=s3_key,
        content_type=file.content_type,
        status=DocumentStatus.uploaded,
        user_id=current_user.id,
    )

    try:
        db.add(document)
        await db.commit()
        await db.refresh(document)
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {
        "id": str(document.id),
        "filename": document.filename,
        "status": document.status,
        "message": "Uploaded successfully",
    }