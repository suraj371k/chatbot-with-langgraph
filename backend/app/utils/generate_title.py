from app.core.llm import get_llm
from langchain_core.messages import HumanMessage

llm = get_llm()

async def generate_title(question: str):
    try:
        prompt = f"generate a very short title for this conversation and do not give any markdown structure only give proper string {question}"
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        title = response.content.strip()
        title = title.strip('"').strip("'")
        if len(title) > 50:
            title = title[:50] + "..."
        return title or question[:30] 
    except Exception:
        return question[:30] + ("..." if len(question) > 30 else "")
