from typing import TypedDict, Annotated , Literal
from langchain_core.messages import SystemMessage , AIMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.store.base import BaseStore
from app.core.llm import get_llm
import asyncio

try:
    from duckduckgo_search import AsyncDDGS
except ImportError:
    AsyncDDGS = None

from duckduckgo_search import DDGS

llm = get_llm()


class State(TypedDict):
    messages: Annotated[list, add_messages]
    needs_web_search: bool
    search_results: str


async def should_web_search(state: State) -> Literal["web_search" , "generate_response"]:
    """
    Determine if we need to perform a web search based on the user's query
    """
    last_message = state["messages"][-1].content.lower() if state["messages"] else ""
        # Keywords that indicate a web search is needed
        
    search_keywords = [
        "search", "find", "look up", "what is", "who is", 
        "tell me about", "latest", "news", "current", "today",
        "recent", "how to", "tutorial", "guide", "information about",
        "online", "website", "url", "link", "article", "blog"
    ]
    
    time_indicators = ["weather", "time", "today", "tomorrow", "now", "currently"]
    word_count = len(last_message.split())
    
    if any(keyword in last_message for keyword in search_keywords) and word_count > 3:
        return "web_search"
    elif any(indicator in last_message for indicator in time_indicators):
        return "web_search"
    else:
        return "generate_response"
    
async def _duckduckgo_search(query: str, max_results: int = 5):
    """Query DuckDuckGo using the available API for the installed package version."""
    if AsyncDDGS is not None:
        async with AsyncDDGS() as ddgs:
            return await ddgs.text(query, max_results=max_results)

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: list(DDGS().text(query, max_results=max_results)))


async def web_search(state: State , config: RunnableConfig , *, store: BaseStore):
    """Perform web search using duck duck go"""
    last_message = state["messages"][-1]
    search_query = last_message.content

    search_indicators = ["search for", "search", "find", "look up", "tell me about", "what is", "who is"]
    query_clean = search_query
    for indicator in search_indicators:
        if indicator in query_clean.lower():
            query_clean = query_clean.lower().replace(indicator, '').strip()
            break
    
    if not query_clean:
        query_clean = search_query
    
    try:
        # Perform the web search
        raw_results = await _duckduckgo_search(query_clean, max_results=5)

        results = [
            {
                'title': r.get('title', 'No title'),
                'body': r.get('body', 'No content'),
                'href': r.get('href', '#'),
            }
            for r in raw_results
        ]
        
        # Format search results
        if results:
            formatted_results = "🔍 **Web Search Results:**\n\n"
            for i, result in enumerate(results, 1):
                formatted_results += f"{i}. **{result['title']}**\n"
                formatted_results += f"   {result['body'][:200]}{'...' if len(result['body']) > 200 else ''}\n"
                formatted_results += f"   Source: {result['href']}\n\n"
            
            # Add source note
            formatted_results += "---\n*Results retrieved via DuckDuckGo*"
        else:
            formatted_results = f"No search results found for '{query_clean}'. Please try a different query."
        
        return {
            "search_results": formatted_results,
            "needs_web_search": True
        }
        
    except asyncio.TimeoutError:
        formatted_results = "⏱️ Search request timed out. Please try again."
        return {
            "search_results": formatted_results,
            "needs_web_search": True
        }
    except Exception as e:
        formatted_results = f"⚠️ An error occurred during web search: {str(e)}"
        return {
            "search_results": formatted_results,
            "needs_web_search": True
        }

async def generate_response(state: State, config: RunnableConfig, *, store: BaseStore):
    """
    Generate a response using LLM, incorporating web search results if available
    """
    user_id = config["configurable"].get("user_id")
    latest_question = state["messages"][-1].content
    
    # Get memory context
    memory_text = ""
    if user_id and store:
        namespace = ("memories", user_id)
        items = await store.asearch(namespace, query=latest_question)
        if items:
            memory_text = "\n".join(f"- {item.value.get('data')}" for item in items)
    
    # Build system prompt
    system_content = "You are a helpful chatbot. Answer the user's query based on the context provided."
    
    if memory_text:
        system_content += f"\n\nKnown facts about this user, use them when relevant:\n{memory_text}"
    
    # If we have search results, incorporate them
    if state.get("needs_web_search") and state.get("search_results"):
        system_content += f"\n\n **Web Search Results for the query:**\n{state['search_results']}"
        system_content += "\n\nPlease use the search results to provide a comprehensive and accurate answer. Cite the sources when possible."
    
    system_msg = SystemMessage(content=system_content)
    messages = state["messages"]
    
    # If we have search results, add a user message with the search context
    if state.get("needs_web_search") and state.get("search_results"):
        # Don't duplicate the search results, they're in the system prompt
        pass
    
    # Generate response
    try:
        res = await llm.ainvoke([system_msg] + messages)
        response_text = res.content
        
        # If we have search results, add source attribution
        if state.get("needs_web_search") and state.get("search_results"):
            response_text += "\n\n---\n*Information retrieved via DuckDuckGo web search.*"
        
        return {"messages": [AIMessage(content=response_text)]}
    except Exception as e:
        error_msg = f"An error occurred while generating the response: {str(e)}"
        return {"messages": [AIMessage(content=error_msg)]}

async def direct_response(state: State, config: RunnableConfig, *, store: BaseStore):
    """
    Generate a response without web search
    """
    user_id = config["configurable"].get("user_id")
    latest_question = state["messages"][-1].content
    
    # Get memory context
    memory_text = ""
    if user_id and store:
        namespace = ("memories", user_id)
        items = await store.asearch(namespace, query=latest_question)
        if items:
            memory_text = "\n".join(f"- {item.value.get('data')}" for item in items)
    
    system_content = "You are a helpful chatbot. Answer the user's query accurately and concisely."
    
    if memory_text:
        system_content += f"\n\nKnown facts about this user, use them when relevant:\n{memory_text}"
    
    system_msg = SystemMessage(content=system_content)
    messages = state["messages"]
    
    res = await llm.ainvoke([system_msg] + messages)
    return {"messages": [res]}



    


workflow = StateGraph(State)
workflow.add_node("web_search", web_search)
workflow.add_node("generate_response", generate_response)
workflow.add_node("direct_response", direct_response)

workflow.add_conditional_edges(
    START,
    should_web_search,
    {
        "web_search": "web_search",
        "generate_response": "direct_response"
    }
)

workflow.add_edge("web_search", "generate_response")
workflow.add_edge("generate_response", END)
workflow.add_edge("direct_response", END)

