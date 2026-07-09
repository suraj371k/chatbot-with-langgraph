from datetime import datetime
import json
import base64

def encode_cursor(created_at: datetime, doc_id: int) -> str:
    raw = json.dumps({"created_at": created_at.isoformat(), "id": str(doc_id)})
    return base64.urlsafe_b64encode(raw.encode()).decode()

def decode_cursor(cursor: str) -> tuple[datetime, int]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    data = json.loads(raw)
    return datetime.fromisoformat(data["created_at"]), data["id"]
