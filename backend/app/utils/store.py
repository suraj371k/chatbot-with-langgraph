import json
import re
import string
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

# Minimum model-reported confidence required to persist a memory.
CONFIDENCE_THRESHOLD = 0.6

# Define invalid patterns
INVALID_FACTS = {
    "unknown", "none", "null", "", "not specified", "n/a",
    "no information", "unavailable", "not available", "not sure",
    "not known", "no data", "no fact", "nothing",
}

TEMPORARY_PATTERNS = [
    r"has not (asked|said|mentioned|requested).*yet",
    r"did not (ask|say|mention|request).*yet",
    r"no (question|information|data|request).*yet",
    r"currently (working on|thinking about|doing)",
    r"in the process of",
    r"just (started|began|finished|completed)",
    r"trying to",
    r"going to",
]

# Contractions get expanded before running TEMPORARY_PATTERNS so "hasn't"
# matches the same rules written for "has not".
CONTRACTIONS = {
    r"\bhasn't\b": "has not",
    r"\bhaven't\b": "have not",
    r"\bhadn't\b": "had not",
    r"\bdidn't\b": "did not",
    r"\bdoesn't\b": "does not",
    r"\bdon't\b": "do not",
    r"\bisn't\b": "is not",
    r"\bwasn't\b": "was not",
    r"\baren't\b": "are not",
    r"\bweren't\b": "were not",
}

SENSITIVE_PATTERNS = [
    r"\b\d{3}-\d{2}-\d{4}\b",  # SSN
    r"\b\d{4} \d{4} \d{4} \d{4}\b",  # Credit card
    r"\b[\w\.-]+@[\w\.-]+\.\w+\b",  # Email (optional)
]

# Backstop denylist: facts that describe the assistant/system/pipeline itself,
# or bare general-knowledge trivia, rather than something about the user.
# This runs in code (not just the prompt) because the LLM's own "is this
# about the user" judgement is not something we can trust unchecked.
NON_USER_SUBJECT_PATTERNS = [
    r"\bassistant('s)?\b",
    r"\b(the\s+)?(ai|chatbot|language model|llm)\b",
    r"\btraining (data|cutoff)\b",
    r"\bknowledge cutoff\b",
    r"\bmemory extraction system\b",
    r"\bthis (system|conversation|pipeline)\b",
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


def normalize_fact(fact: str) -> str:
    """Lowercase + strip surrounding whitespace/punctuation so trivial
    variants like 'Unknown.' or '"n/a"' still match INVALID_FACTS."""
    return fact.strip().strip(string.punctuation + " ").lower()


def expand_contractions(text: str) -> str:
    for pattern, replacement in CONTRACTIONS.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def is_valid_memory(fact: str) -> bool:
    """Check if a fact is worth storing as a memory."""
    if not fact or not fact.strip():
        return False
    
    normalized = normalize_fact(fact)
    
    # Check against invalid facts (normalized, so punctuation/case variants
    # of "unknown", "n/a", etc. are still caught)
    if normalized in INVALID_FACTS:
        return False
    
    # Check minimum length (at least 2 words)
    words = fact.split()
    if len(words) < 2:
        return False
    
    # Check if it contains any alphabetic characters
    if not any(c.isalpha() for c in fact):
        return False
    
    return True


def is_about_assistant_or_system(fact: str) -> bool:
    """Reject facts describing the assistant, the LLM, or this pipeline
    instead of the user (e.g. 'assistant's training data is cut off...',
    'user is interacting with a memory extraction system')."""
    fact_lower = fact.lower()
    return any(re.search(pattern, fact_lower) for pattern in NON_USER_SUBJECT_PATTERNS)


def is_temporary_state(fact: str) -> bool:
    """Check if the fact is just a temporary state, not a permanent memory."""
    fact_lower = expand_contractions(fact.lower())
    
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
    Extract facts about the HUMAN USER from this exchange that are worth storing as
    LONG-TERM memories in a separate database. Nobody but the user's own statements
    counts as a source — the assistant's reply is context only.

    RULES:
    1. Extract ONLY if the user shares durable PERSONAL information about themselves
       (identity, preferences, skills, goals, life events).
    2. Extract ONLY definitive, stable facts (e.g., "user is a software engineer").
    3. DO NOT extract temporary states (e.g., "user is currently working on X").
    4. DO NOT extract if the user is just asking a question without sharing info.
    5. DO NOT extract if the user is just confirming, acknowledging, or making small talk.
    6. DO NOT extract facts about the assistant, the AI, the chatbot, its training data,
       knowledge cutoff, or this memory/extraction system itself.
    7. DO NOT extract general knowledge, trivia, or explanations the assistant gave
       (e.g. "testosterone regulates fat distribution") unless the user stated it as a
       personal fact about themselves (e.g. "user has low testosterone").
    8. If a field would be a guess, a placeholder, or "unknown" — omit that memory
       entirely instead of including a null/placeholder value.
    9. Return an EMPTY list if no durable, user-specific information is shared.

    Types of information to extract:
    - Identity: Name, profession, location, education, job title
    - Preferences: Food preferences, hobbies, interests, likes/dislikes
    - Skills: Technical skills, languages, certifications, expertise
    - Life events: Recent changes, milestones, achievements
    - Goals: Career goals, learning objectives, aspirations

    Conversation:
    User: {question}
    Assistant: {answer}

    Return JSON only, no other text. Each item must include every field:
    [{{
      "fact": "description",
      "category": "identity|preference|skill|goal|life_event",
      "about_user": true,
      "confidence": 0.0-1.0
    }}]
    "about_user" must be true for every item — if it would be false, omit the item
    instead. If nothing qualifies, return: []
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
        fact = (memory.get("fact") or "").strip()
        category = memory.get("category", "general")
        about_user = memory.get("about_user", False)
        confidence = memory.get("confidence", 0)
        
        # Step 0: Structural gate — must be explicitly about the user and
        # confident enough. Missing/false/low values are rejected, not
        # assumed safe.
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0
        
        if not about_user:
            print(f"Skipping memory not marked about_user: {fact}")
            continue
        
        if confidence < CONFIDENCE_THRESHOLD:
            print(f"Skipping low-confidence memory ({confidence}): {fact}")
            continue
        
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
        
        # Step 3b: Backstop denylist — catches assistant/system-meta facts
        # even if the LLM mislabeled about_user as true.
        if is_about_assistant_or_system(fact):
            print(f"Skipping non-user-subject memory: {fact}")
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
 


