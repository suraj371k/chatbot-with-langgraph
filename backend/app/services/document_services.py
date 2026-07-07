import pypdf
import io
from fastapi.concurrency import run_in_threadpool
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.pinecone import pc
from app.core.config import settings
from app.core.database import SessionLocal
from sqlalchemy import update  
from app.models.models import Document , DocumentStatus

def _extract_text_sync(pdf_bytes: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))

    if reader.is_encrypted:
        try:
            result = reader.decrypt("")
            if result == 0:
                raise ValueError(
                    "PDF is password-protected. Please upload an unlocked PDF."
                )
        except Exception as e:
            raise ValueError(f"PDF is encrypted and could not be opened: {e}")

    full_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text and text.strip():
            full_text += text + "\n"

    if not full_text.strip():
        raise ValueError(
            "Could not extract text from PDF. It may be a scanned image-only PDF."
        )

    return full_text


async def extract_text(pdf_bytes: bytes) -> str:
    return await run_in_threadpool(_extract_text_sync, pdf_bytes)


def _split_text_sync(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )
    return splitter.split_text(text)


async def split_text(text: str) -> list[str]:
    return await run_in_threadpool(_split_text_sync, text)
    
async def process_document(pdf_bytes: bytes) -> list[str]:
    text = await extract_text(pdf_bytes)     
    chunks = await split_text(text)          
    return chunks

    
async def store_in_pinecone(user_id: str , document_id: str  , chunks: list[str]):
    
  
    if not chunks:
        raise ValueError("No chunks provided to store_in_pinecone.")

    records = []
    for i, chunk_text in enumerate(chunks):
        records.append({
            "_id": f"{document_id}#chunk{i}",
            "text": chunk_text,
            "document_id": document_id,
            "chunk_index": i
        })
    
    index = pc.Index(host=settings.pinecone_host)
    index.upsert_records(
        records=records,
        namespace=user_id
    )
    print("Successfully uploaded chunks to Pinecone!")


async def background_pinecone_indexing(user_id: str, document_id: str, chunks: list[str]):
    async with SessionLocal() as db:  
        try:
            await db.execute(
                update(Document).where(Document.id == document_id).values(status=DocumentStatus.processing)
            )
            await db.commit()

            await store_in_pinecone(user_id=user_id, document_id=str(document_id), chunks=chunks)

            await db.execute(
                update(Document).where(Document.id == document_id).values(status=DocumentStatus.embedded)
            )
            await db.commit()

        except Exception as e:
            print(f"Failed to index document {document_id} in Pinecone: {e}")
            await db.rollback()
            try:
                await db.execute(
                    update(Document).where(Document.id == document_id).values(status=DocumentStatus.failed)
                )
                await db.commit()
            except Exception as db_err:
                print(f"Failed to write failed status to DB: {db_err}")

