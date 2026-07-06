# 🤖 LangGraph Chatbot

A full-stack conversational AI application built with LangGraph for agent orchestration, FastAPI for the backend, PostgreSQL (AWS RDS) for persistence, and Next.js for the frontend.

## ✨ Features

- **🧠 Dual Memory System**
  - Short-term memory: Conversation state persisted per thread using LangGraph's checkpointer
  - Long-term memory: Cross-session facts/preferences stored via LangGraph's Store API *(WIP)*

- **⚡ Tech Stack**
  - **Backend**: FastAPI, LangGraph, SQLAlchemy, Alembic
  - **Database**: PostgreSQL on AWS RDS
  - **Frontend**: Next.js 14, TypeScript, Tailwind CSS

- **🔧 Key Capabilities**
  - Async REST API
  - Persistent conversations across sessions
  - Modular graph design for easy extension
  - Versioned database migrations with Alembic

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend Setup
```bash
# Clone repository
git clone https://github.com/suraj371k/langgraph-chatbot.git
cd langgraph-chatbot

# Setup virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
