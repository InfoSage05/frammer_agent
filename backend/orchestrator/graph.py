"""
LangGraph Orchestrator - Stateful graph for agent coordination.
Implements ReAct-style reasoning with intent classification and task routing.
"""
from typing import TypedDict, List, Dict, Any, Optional, Literal, Annotated
from pathlib import Path
import operator

from langgraph.graph import StateGraph, END

# Try different import paths for MemorySaver (varies by version)
try:
    from langgraph.checkpoint.memory import MemorySaver
except ImportError:
    try:
        from langgraph.checkpoint import MemorySaver
    except ImportError:
        # Fallback: create a simple in-memory saver
        class MemorySaver:
            def __init__(self):
                self.storage = {}

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from orchestrator.nodes import (
    route_intent,
    select_data,
    plan_analysis,
    execute_analysis_node,
    narrate_results_node,
    handle_meta_query
)


# ─── State Definition ────────────────────────────────────────────────────────

class AgentState(TypedDict):
    """State passed between graph nodes."""
    # Conversation
    messages: Annotated[List[Dict[str, str]], operator.add]
    user_query: str
    
    # Intent & Planning
    intent: str  # "analysis", "visualization", "data_management", "meta", "unknown"
    plan: List[Dict[str, Any]]
    current_step: int
    
    # Data Context
    datasets_in_scope: List[int]  # Dataset IDs
    selected_columns: Dict[str, List[str]]  # {dataset_name: [columns]}
    
    # Execution
    code: str
    execution_result: Dict[str, Any]
    
    # Outputs
    response: str
    artifacts: List[Dict[str, Any]]  # Generated tables/figures
    suggestions: List[str]  # Follow-up suggestions
    
    # Control
    error: Optional[str]
    retry_count: int


# ─── Graph Definition ────────────────────────────────────────────────────────

def create_agent_graph() -> StateGraph:
    """Create the LangGraph agent workflow."""
    
    # Initialize graph with state schema
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("router", route_intent)
    workflow.add_node("data_selector", select_data)
    workflow.add_node("planner", plan_analysis)
    workflow.add_node("executor", execute_analysis_node)
    workflow.add_node("narrator", narrate_results_node)
    workflow.add_node("meta_handler", handle_meta_query)
    
    # Set entry point
    workflow.set_entry_point("router")
    
    # Add conditional edges from router
    workflow.add_conditional_edges(
        "router",
        _route_after_intent,
        {
            "analysis": "data_selector",
            "visualization": "data_selector",
            "data_management": "meta_handler",
            "meta": "meta_handler",
            "unknown": "meta_handler"
        }
    )
    
    # Data selector → Planner
    workflow.add_edge("data_selector", "planner")
    
    # Planner → Executor
    workflow.add_edge("planner", "executor")
    
    # Executor → Narrator (always narrate results)
    workflow.add_edge("executor", "narrator")
    
    # Narrator → END
    workflow.add_edge("narrator", END)
    
    # Meta handler → END
    workflow.add_edge("meta_handler", END)
    
    return workflow


def _route_after_intent(state: AgentState) -> str:
    """Determine next node based on classified intent."""
    intent = state.get("intent", "unknown")
    
    if intent in ["analysis", "visualization"]:
        return intent
    elif intent == "data_management":
        return "data_management"
    else:
        return "meta"


# ─── Compiled Graph ──────────────────────────────────────────────────────────

def get_compiled_graph():
    """Get the compiled agent graph with memory checkpointing."""
    workflow = create_agent_graph()
    
    # Try to add memory checkpointing, fall back to no checkpointing
    try:
        memory = MemorySaver()
        return workflow.compile(checkpointer=memory)
    except Exception:
        # Compile without checkpointing if not supported
        return workflow.compile()


# ─── Graph Execution ─────────────────────────────────────────────────────────

async def run_agent(
    query: str,
    session_id: str,
    conversation_history: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Run the agent graph for a user query.
    
    Args:
        query: User's question/request
        session_id: Unique session identifier
        conversation_history: Previous messages
    
    Returns:
        Agent response with artifacts
    """
    graph = get_compiled_graph()
    
    # Build initial state
    initial_state: AgentState = {
        "messages": conversation_history or [],
        "user_query": query,
        "intent": "",
        "plan": [],
        "current_step": 0,
        "datasets_in_scope": [],
        "selected_columns": {},
        "code": "",
        "execution_result": {},
        "response": "",
        "artifacts": [],
        "suggestions": [],
        "error": None,
        "retry_count": 0
    }
    
    # Add the new user message
    initial_state["messages"].append({
        "role": "user",
        "content": query
    })
    
    # Run the graph
    config = {"configurable": {"thread_id": session_id}}
    
    try:
        # Try async invoke first
        final_state = await graph.ainvoke(initial_state, config)
    except (AttributeError, TypeError):
        # Fall back to sync invoke if async not available
        import asyncio
        final_state = await asyncio.get_event_loop().run_in_executor(
            None, lambda: graph.invoke(initial_state, config)
        )
    
    return {
        "response": final_state.get("response", ""),
        "artifacts": final_state.get("artifacts", []),
        "suggestions": final_state.get("suggestions", []),
        "intent": final_state.get("intent", ""),
        "error": final_state.get("error")
    }


def run_agent_sync(
    query: str,
    session_id: str,
    conversation_history: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """Synchronous version of run_agent."""
    graph = get_compiled_graph()
    
    initial_state: AgentState = {
        "messages": conversation_history or [],
        "user_query": query,
        "intent": "",
        "plan": [],
        "current_step": 0,
        "datasets_in_scope": [],
        "selected_columns": {},
        "code": "",
        "execution_result": {},
        "response": "",
        "artifacts": [],
        "suggestions": [],
        "error": None,
        "retry_count": 0
    }
    
    initial_state["messages"].append({
        "role": "user",
        "content": query
    })
    
    config = {"configurable": {"thread_id": session_id}}
    final_state = graph.invoke(initial_state, config)
    
    return {
        "response": final_state.get("response", ""),
        "artifacts": final_state.get("artifacts", []),
        "suggestions": final_state.get("suggestions", []),
        "intent": final_state.get("intent", ""),
        "error": final_state.get("error")
    }
