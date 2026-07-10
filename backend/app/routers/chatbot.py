import asyncio
import json
from langchain_core.messages import HumanMessage
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.chat_schema import ChatInput, ChatHistoryResponse, ChatResponse, ConversationListResponse, ConversationSummary, ChatMessage , UpdateTitleRequest
from app.dependencies.get_db import get_db
from app.dependencies.get_user import get_current_user
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select , delete , update
from app.models.models import Conversation , TokenUsage, Document, DocumentStatus
from app.dependencies.token_limit import enforce_token_limit
from app.utils.token_limit import record_tokens
import uuid
from app.core import graph_setup
from fastapi.responses import StreamingResponse
from app.utils.generate_title import generate_title
from app.utils.store import extract_and_store_memory
import tiktoken
from app.core.database import SessionLocal
router = APIRouter()

encoder = tiktoken.get_encoding("cl100k_base")


@router.post("/stream", tags=["chat"])
async def ask_question(
    payload: ChatInput,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    usage_row: TokenUsage = Depends(enforce_token_limit),
):
    if payload.conversation_id:
        conversation_id = payload.conversation_id
    else:
        title = await generate_title(payload.question)
        conversation = Conversation(name=title, user_id=current_user.id)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        conversation_id = conversation.id

    config = {"configurable": {"thread_id": str(conversation_id), "user_id": str(current_user.id)}}
    user_id = current_user.id

    verified_document_ids: list[str] = []
    if payload.document_ids:
        result = await db.execute(
            select(Document.id).where(
                Document.id.in_(payload.document_ids),
                Document.user_id == current_user.id,
                Document.status == DocumentStatus.embedded,
            )
        )
        verified_document_ids = [str(row) for row in result.scalars().all()]

    initial_state = {"messages": [HumanMessage(content=payload.question)]}
    if verified_document_ids:
        initial_state["document_ids"] = verified_document_ids

    async def event_generator():
        full_response = ""

        try:
            async for event in graph_setup.graph.astream(
                initial_state,
                config=config,
                stream_mode="messages",
                version="v2",
            ):
                if event.get("type") != "messages":
                    continue

                message_chunk, _ = event.get("data", (None, None))
                if not message_chunk or not message_chunk.content:
                    continue

                full_response += message_chunk.content
                # JSON-encode the payload so embedded newlines (extremely common
                # in code/lists/multi-paragraph output) become escaped \n
                # characters instead of literal line breaks. A raw newline here
                # would split this into multiple physical lines, and only the
                # first would carry the required "data:" prefix per the SSE
                # spec — every following line would be silently dropped by any
                # client that filters for "data:"-prefixed lines.
                sse_payload = json.dumps({"type": "chunk", "content": message_chunk.content})
                yield f"data: {sse_payload}\n\n"

        except Exception as e:
            sse_payload = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {sse_payload}\n\n"

        finally:
            input_tokens = len(encoder.encode(payload.question))
            output_tokens = len(encoder.encode(full_response))
            actual_tokens = input_tokens + output_tokens

            async def _record_usage():
                async with SessionLocal() as fresh_db:
                    result = await fresh_db.execute(
                        select(TokenUsage).where(TokenUsage.user_id == user_id).with_for_update()
                    )
                    row = result.scalar_one_or_none()
                    if row:
                        row.tokens_used += actual_tokens
                        await fresh_db.commit()

            asyncio.create_task(_record_usage())

            if full_response:
                asyncio.create_task(
                    extract_and_store_memory(payload.question, full_response, user_id)
                )

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
        
@router.get('/', response_model=ConversationListResponse, tags=['chat'])
async def conversation_list(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    result = await db.execute(select(Conversation).where(Conversation.user_id == current_user.id))
    conversations = result.scalars().all()

    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                conversation_id=c.id,
                name=c.name,
                created_at=c.created_at
            )
            for c in conversations
        ]
    )


@router.get('/messages/{conversation_id}', response_model=ChatHistoryResponse, tags=["chat"])
async def get_conversation_history(conversation_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    # verify conversation belongs to this user
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    config = {"configurable": {"thread_id": str(conversation_id)}}
    state = await graph_setup.graph.aget_state(config)

    role_map = {"human": "user", "ai": "assistant"}
    messages = [
        ChatMessage(role=role_map.get(m.type, "user"), content=m.content)
        for m in state.values.get("messages", [])
    ]

    return ChatHistoryResponse(
        conversation_id=conversation.id,
        user_id=conversation.user_id,
        conversation_name=conversation.name or "New Chat",
        messages=messages
    )
    

@router.delete('/{conversation_id}' , tags=["chat"])
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        stmt = delete(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
        result = await db.execute(stmt)
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or you don't have permission"
            )
        
        return {
            "message": "Conversation deleted successfully",
            "deleted_id": conversation_id
        }
        
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete conversation: {str(e)}"
        )

@router.put('/{conversation_id}', tags=["chat"])
async def update_title(
    conversation_id: str, 
    request: UpdateTitleRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        stmt = update(Conversation).where(
            Conversation.user_id == current_user.id,
            Conversation.id == conversation_id
        ).values(
            name=request.title
        )
        
        result = await db.execute(stmt)
        await db.commit() 
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found or you don't have permission"
            )
        
        return {
            "message": "Conversation title updated successfully", 
            "updated_id": conversation_id, 
            "new_title": request.title
        }
        
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update conversation: {str(e)}"
        )


@router.get('/store', tags=["chat"])
async def fetch_store(current_user=Depends(get_current_user)):
    from app.utils.store import store

    namespace = ("memories", str(current_user.id))
    items = await store.asearch(namespace)

    return {
        "memories": [
            {"fact": item.value.get("data"), "key": item.key}
            for item in items
        ]
    }