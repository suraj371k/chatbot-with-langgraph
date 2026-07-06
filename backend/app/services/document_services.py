import pypdf
import io
from fastapi.concurrency import run_in_threadpool
from langchain_text_splitters import RecursiveCharacterTextSplitter


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

    # generate embedding
    
    # store in vector database