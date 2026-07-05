from functools import lru_cache
from langchain_groq import ChatGroq
from app.core.config import settings

@lru_cache(maxsize=1)
def get_llm():
    return ChatGroq(
        groq_api_key=settings.groq_key,
        model_name="llama-3.1-8b-instant",
        temperature=0,
    )
