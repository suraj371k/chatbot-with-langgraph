import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.database import engine, Base
from app.core.graph_setup import init_graph, close_graph
from fastapi.middleware.cors import CORSMiddleware

from app.routers.auth import router as auth_router
from app.routers.user import router as user_router
from app.routers.chatbot import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    await init_graph()
    
    yield
    
    await close_graph()
    await engine.dispose()

app = FastAPI(
    title="Chatbot API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)

app.include_router(auth_router, prefix="/api/auth")
app.include_router(user_router, prefix="/api/user")
app.include_router(chat_router, prefix="/api/chat")