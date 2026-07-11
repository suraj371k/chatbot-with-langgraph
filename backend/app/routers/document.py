import uuid
import boto3
from botocore.exceptions import ClientError

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, status , Query
from datetime import datetime
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import  select , update , delete , func
from pydantic import BaseModel
from typing import Optional
from app.dependencies.get_db import get_db
from app.dependencies.get_user import get_current_user
from app.core.config import settings
from app.models.models import Document, DocumentStatus
from app.schemas.document_schema import DocumentResponse , DocumentListResponse

from app.services.document_services import  process_document , background_pinecone_indexing , delete_document_from_pinecone



router = APIRouter()
s3 = boto3.client(
    "s3",
    region_name=settings.bucket_region,
    aws_access_key_id=settings.bucket_access_key,
    aws_secret_access_key=settings.bucket_secret_key,
    endpoint_url=settings.bucket_endpoint,
)
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
        size=len(file_bytes),
        content_type=file.content_type,
        status=DocumentStatus.uploaded, 
        s3_key=s3_key,
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


@router.get('/', tags=["documents"] , response_model=DocumentListResponse, status_code=status.HTTP_200_OK)
async def get_all_documents(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    offset = (page - 1) * limit

    count_query = select(func.count()).select_from(Document).where(Document.user_id == current_user.id)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    query = (
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc(), Document.id.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    documents = result.scalars().all()

    total_pages = (total + limit - 1) // limit if total > 0 else 0
    has_more = page < total_pages

    return DocumentListResponse(
        documents=documents,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        has_more=has_more,
    )

@router.delete("/{document_id}", tags=["documents"])
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    document = stmt.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    try:
        await run_in_threadpool(
            s3.delete_object, Bucket=settings.bucket_name, Key=document.s3_key
        )
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code != "NoSuchKey":
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to delete file from storage: {error_code}",
            )

    try:
        await run_in_threadpool(
            delete_document_from_pinecone,
            user_id=str(current_user.id),
            document_id=str(document.id),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to delete vectors from Pinecone: {e}",
        )

    try:
        await db.delete(document)
        await db.commit()
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while deleting document: {e}",
        )

    return {"message": "Document deleted successfully"}

class DocumentUpdate(BaseModel):
    filename: str


@router.put('/{document_id}', tags=["documents"])
async def update_document_name(
    document_id: str, 
    document: DocumentUpdate, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    try:
        stmt = (
            update(Document)
            .where(Document.id == document_id, Document.user_id == current_user.id)
            .values(filename=document.filename)
        )
        
        result = await db.execute(stmt)
        
        if result.rowcount == 0:
            await db.rollback() 
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Document not found or you do not have permission to update it"
            )
        
        await db.commit()
        
        return {"message": "Document updated successfully"}

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Database error: {str(e)}")