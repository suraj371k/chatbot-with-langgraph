from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from app.graphs.chat_graph import workflow
from app.core.config import settings
from app.utils.store import init_store, close_store
from app.utils import store as _store_module

graph = None
_checkpointer_cm = None
_checkpointer = None


async def init_graph():
    global graph, _checkpointer_cm, _checkpointer

    _checkpointer_cm = AsyncPostgresSaver.from_conn_string(settings.db_url_psycopg)
    _checkpointer = await _checkpointer_cm.__aenter__()

    await _checkpointer.setup() 

    # Long-term memory store 
    await init_store()
    memory_store = _store_module.store

    graph = workflow.compile(checkpointer=_checkpointer, store=memory_store)


async def close_graph():
    if _checkpointer_cm:
        await _checkpointer_cm.__aexit__(None, None, None)
    await close_store()