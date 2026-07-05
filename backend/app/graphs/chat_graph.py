from typing import TypedDict, Annotated
from langchain_core.messages import SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.store.base import BaseStore
from app.core.llm import get_llm

llm = get_llm()


class State(TypedDict):
    messages: Annotated[list, add_messages]


async def generate_response(state: State, config: RunnableConfig, *, store: BaseStore):
    user_id = config["configurable"].get("user_id")
    latest_question = state["messages"][-1].content

    memory_text = ""
    if user_id and store:
        namespace = ("memories", user_id)
        items = await store.asearch(namespace, query=latest_question)
        if items:
            memory_text = "\n".join(f"- {item.value.get('data')}" for item in items)

    system_content = "You are a helpful chatbot, answer the user's query according to the question."
    if memory_text:
        system_content += f"\n\nKnown facts about this user, use them when relevant:\n{memory_text}"

    system_msg = SystemMessage(content=system_content)
    messages = state["messages"]
    res = await llm.ainvoke([system_msg] + messages)
    return {"messages": [res]}



workflow = StateGraph(State)
workflow.add_node("generate_response", generate_response)
workflow.add_edge(START, "generate_response")
workflow.add_edge("generate_response", END)

