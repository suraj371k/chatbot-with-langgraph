import asyncio
from sentence_transformers import SentenceTransformer

_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

EMBEDDING_DIMS = 384  


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Required signature for LangGraph's store index config: list[str] -> list[list[float]].
    model.encode() is CPU-bound and blocking, so it runs in a thread pool
    to avoid stalling the event loop for other requests.
    """
    loop = asyncio.get_event_loop()
    embeddings = await loop.run_in_executor(None, _model.encode, texts)
    return embeddings.tolist()
