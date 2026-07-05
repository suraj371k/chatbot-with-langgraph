import json
import re
import uuid
from typing import List, Dict, Optional
from datetime import datetime

from app.core.llm import get_llm
from app.core.config import settings
from app.utils.embeddings import embed_texts, EMBEDDING_DIMS
from langgraph.store.postgres.aio import AsyncPostgresStore

llm = get_llm()

_store_cm = None
store = None

# Define invalid patterns
INVALID_FACTS = {
    "unknown", "none", "null", "", "not specified", "n/a",
    "no information", "unavailable", "not available"
}

TEMPORARY_PATTERNS = [
    r"has not (asked|said|mentioned|requested).*yet",
    r"didn't (ask|say|mention|request).*yet",
    r"no (question|information|data|request).*yet",
    r"currently (working on|thinking about|doing)",
    r"in the process of",
    r"just (started|began|finished|completed)",
    r"trying to",
    r"going to",
]

SENSITIVE_PATTERNS = [
    r"\b\d{3}-\d{2}-\d{4}\b",  # SSN
    r"\b\d{4} \d{4} \d{4} \d{4}\b",  # Credit card
    r"\b[\w\.-]+@[\w\.-]+\.\w+\b",  # Email (optional)
]


async def init_store():
    global store, _store_cm

    _store_cm = AsyncPostgresStore.from_conn_string(
        settings.db_url_psycopg,
        index={"dims": EMBEDDING_DIMS, "embed": embed_texts, "fields": ["data"]},
    )
    store = await _store_cm.__aenter__()
    await store.setup()


async def close_store():
    if _store_cm:
        await _store_cm.__aexit__(None, None, None)


def parse_json(text: str) -> list[dict]:
    """Parse JSON from LLM response with better error handling."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        # Try to extract JSON from the text
        json_match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except:
                pass
        return []


def is_valid_memory(fact: str) -> bool:
    """Check if a fact is worth storing as a memory."""
    if not fact or not fact.strip():
        return False
    
    fact_lower = fact.lower().strip()
    
    # Check against invalid facts
    if fact_lower in INVALID_FACTS:
        return False
    
    # Check minimum length (at least 2 words)
    words = fact.split()
    if len(words) < 2:
        return False
    
    # Check if it contains any alphabetic characters
    if not any(c.isalpha() for c in fact):
        return False
    
    return True


def is_temporary_state(fact: str) -> bool:
    """Check if the fact is just a temporary state, not a permanent memory."""
    fact_lower = fact.lower()
    
    # Check against temporary patterns
    for pattern in TEMPORARY_PATTERNS:
        if re.search(pattern, fact_lower, re.IGNORECASE):
            return True
    
    # Check for temporary time indicators
    temp_indicators = ["now", "currently", "today", "this week", "right now"]
    if any(indicator in fact_lower for indicator in temp_indicators):
        # Only consider it temporary if it's describing a state, not an attribute
        state_verbs = ["am", "is", "are", "was", "were", "feeling", "thinking"]
        if any(verb in fact_lower.split()[:5] for verb in state_verbs):
            return True
    
    return False


def is_sensitive_info(fact: str) -> bool:
    """Check if the fact contains sensitive information."""
    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, fact, re.IGNORECASE):
            return True
    
    # Check for explicit sensitive information
    sensitive_terms = ["password", "ssn", "credit card", "bank account", "id number"]
    if any(term in fact.lower() for term in sensitive_terms):
        return True
    
    return False


def is_duplicate_existing(existing_memories: List, fact: str, threshold: float = 0.85) -> bool:
    """Check if a similar memory already exists."""
    if not existing_memories:
        return False
    
    for memory in existing_memories:
        if memory.score is not None and memory.score >= threshold:
            return True
    return False


async def extract_memories(question: str, answer: str) -> List[Dict[str, str]]:
    """Extract only meaningful, durable memories."""
    
    prompt = f"""
    You are a memory extraction system. Extract ONLY facts that should be stored as LONG-TERM memories.

    RULES:
    1. Extract ONLY if the user shares PERSONAL information about themselves
    2. Extract ONLY definitive, stable facts (e.g., "user is a software engineer")
    3. DO NOT extract temporary states (e.g., "user is currently working on X")
    4. DO NOT extract if the user is just asking a question without sharing info
    5. DO NOT extract if the user is just confirming or acknowledging
    6. DO NOT extract system or conversational states
    7. Return EMPTY list if no durable information is shared

    Types of information to extract:
    - Identity: Name, profession, location, education, job title
    - Preferences: Food preferences, hobbies, interests, likes/dislikes
    - Skills: Technical skills, languages, certifications, expertise
    - Life events: Recent changes, milestones, achievements
    - Goals: Career goals, learning objectives, aspirations

    Conversation:
    User: {question}
    Assistant: {answer}

    Return JSON only, no other text. Format: [{{"fact": "description", "category": "identity|preference|skill|goal|life_event"}}]
    If nothing to extract, return: []
    """
    
    try:
        result = await llm.ainvoke(prompt)
        facts = parse_json(result.content)
        return facts
    except Exception as e:
        print(f"Error extracting memories: {e}")
        return []


async def store_memory(namespace: tuple, fact: str, category: str = "general"):
    """Store a single memory with metadata."""
    try:
        await store.aput(
            namespace,
            str(uuid.uuid4()),
            {
                "data": fact,
                "category": category,
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
        )
        return True
    except Exception as e:
        print(f"Error storing memory: {e}")
        return False


async def extract_and_store_memory(question: str, answer: str, user_id: str):
    """Main function to extract and store memories with validation."""
    
    # Early exit if no meaningful exchange
    if not answer or len(answer.strip()) < 10:
        print("Skipping memory extraction - answer too short")
        return
    
    # Extract potential memories
    potential_memories = await extract_memories(question, answer)
    
    if not potential_memories:
        print("No memories extracted from this exchange")
        return
    
    namespace = ("memories", str(user_id))
    stored_count = 0
    
    for memory in potential_memories:
        fact = memory.get("fact", "").strip()
        category = memory.get("category", "general")
        
        # Step 1: Basic validation
        if not is_valid_memory(fact):
            print(f"Skipping invalid memory: {fact}")
            continue
        
        # Step 2: Check if it's a temporary state
        if is_temporary_state(fact):
            print(f"Skipping temporary state: {fact}")
            continue
        
        # Step 3: Check for sensitive information
        if is_sensitive_info(fact):
            print(f"Skipping sensitive information: {fact}")
            continue
        
        # Step 4: Check for duplicates
        try:
            existing = await store.asearch(namespace, query=fact, limit=3)
            if is_duplicate_existing(existing, fact):
                print(f"Memory already exists (similar): {fact}")
                continue
        except Exception as e:
            print(f"Error checking duplicates: {e}")
            # Continue anyway - better to store duplicate than lose info
        
        # Step 5: Store the memory
        success = await store_memory(namespace, fact, category)
        if success:
            stored_count += 1
            print(f"Stored memory: {fact} (category: {category})")
    
    print(f"Stored {stored_count} new memories for user {user_id}")
 


