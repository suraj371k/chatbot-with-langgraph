import uuid
import boto3
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import  select 

from app.dependencies.get_db import get_db
from app.dependencies.get_user import get_current_user
from app.core.config import settings
from app.models.models import Document, DocumentStatus
from app.services.document_services import  process_document , background_pinecone_indexing
router = APIRouter()
s3 = boto3.client("s3", region_name=settings.bucket_region)
ALLOWED_EXTENSIONS = (".pdf", ".doc", ".docx")



@router.post("/upload", tags=["documents"])
async def upload_file(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db), 
    current_user=Depends(get_current_user),
):
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail="File type not allowed")

    file_bytes = await file.read()
    await file.seek(0)

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
    
    chunks = await process_document(file_bytes)

    background_tasks.add_task(
    background_pinecone_indexing,
    user_id=str(current_user.id),
    document_id=str(document.id),
    chunks=chunks,
)


    return {
        "id": str(document.id),
        "filename": document.filename,
        "status": document.status,
        "message": "Uploaded successfully. Processing and vector indexing started in the background.",
    }
    
@router.get('/', tags=["documents"])
async def get_all_documents(current_user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.user_id == current_user.id))
    documents = result.scalars().all()
    return documents