import asyncio
from fastembed import TextEmbedding

_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

EMBEDDING_DIMS = 384  # same as all-MiniLM-L6-v2, so no dims/index change needed


def _encode(texts: list[str]) -> list[list[float]]:
    return [vec.tolist() for vec in _model.embed(texts)]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Required signature for LangGraph's store index config: list[str] -> list[list[float]].
    fastembed's encode is CPU-bound and blocking, so it runs in a thread pool
    to avoid stalling the event loop for other requests.
    """
    loop = asyncio.get_event_loop()
    embeddings = await loop.run_in_executor(None, _encode, texts)
    return embeddings
