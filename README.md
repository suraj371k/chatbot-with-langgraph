# LangGraph Chatbot

### A full-stack conversational AI application built with LangGraph for agent orchestration, FastAPI for the backend API, PostgreSQL (AWS RDS) for persistence, and Next.js for the frontend. The chatbot implements both short-term memory (via LangGraph checkpointer) and long-term memory (via LangGraph Store), enabling context-aware, persistent conversations across sessions.


### Features


Short-term memory — conversation state persisted per thread using LangGraph's checkpointer, backed by PostgreSQL
Long-term memory — cross-session facts/preferences stored and retrieved via LangGraph's Store API  (work in progress...)
FastAPI backend — async REST API serving the LangGraph agent
PostgreSQL on AWS RDS — managed, durable storage for chat history and memory
Alembic migrations — versioned schema management
Next.js frontend — modern chat UI (work in progress...)
Modular graph design — easy to extend with new nodes, tools, or memory strategies


