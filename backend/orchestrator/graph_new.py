"""
Proper ReAct-style orchestrator where Planning Agent uses Code Agent as a TOOL.

Flow:
1. Planner analyzes query, searches datasets, decides what to do
2. Planner can call tools multiple times:
   - execute_code(task_description) - to compute/analyze/aggregate
   - search_columns(query) - to find relevant data
   - get_sample(dataset_id) - to inspect data
3. Planner synthesizes final response after gathering all needed info
"""
import logging
from typing import TypedDict, List, Dict, Any, Optional, Literal
from langgraph.graph import StateGraph, END
import json

logger = logging.getLogger("frammer.orchestrator")


# ─── State ────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    """State for ReAct loop."""
    # Input
    query: str
    session_id: str
    conversation_history: List[Dict[str, str]]
    
    # Planning & Reasoning
    thoughts: List[str]  # Planner's reasoning steps
    tool_calls: List[Dict[str, Any]]  # All tool invocations
    tool_results: List[Dict[str, Any]]  # Results from each tool call
    iteration: int
    max_iterations: int
    
    # Final output
    response: str
    artifacts: List[Dict[str, Any]]
    suggestions: List[str]
    
    # Control
    next_action: Literal["plan", "execute_tool", "synthesize", "end"]
    pending_tool: Optional[Dict[str, Any]]  # Tool waiting to be executed


# ─── Nodes ────────────────────────────────────────────────────────────────────

def planner_node(state: AgentState) -> AgentState:
    """
    Planning node that:
    1. Analyzes current situation
    2. Decides if it needs to call a tool
    3. If enough info gathered, proceeds to synthesize
    """
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from llm.groq_client import think_complete
    from context_manager.registry import get_registry
    
    query = state["query"]
    iteration = state.get("iteration", 0)
    max_iter = state.get("max_iterations", 5)
    thoughts = state.get("thoughts", [])
    tool_results = state.get("tool_results", [])
    
    logger.info(f"🧠 Planning iteration {iteration+1}/{max_iter}")
    
    # Get available datasets
    registry = get_registry()
    schema_summary = registry.get_schema_summary()
    
    # Build context for planner
    context = f"""
You are a planning agent that uses tools to answer user queries about data.

Available Datasets:
{schema_summary}

Previous thoughts: {thoughts}

Tool results so far:
{json.dumps(tool_results, indent=2) if tool_results else "None yet"}

User Query: {query}

Your job is to THINK step-by-step and decide what to do next.

Available tools:
1. execute_code(description, requirements) - Generate and run Python code to compute/analyze data
   - description: What you want to compute (e.g., "Calculate monthly aggregates", "Create time series forecast")
   - requirements: Dict with "datasets", "columns", "operations" needed
   
2. search_columns(search_query) - Find relevant columns/datasets semantically
   - search_query: Natural language description of what data you're looking for
   
3. get_sample(dataset_id, limit) - Get sample rows to inspect data structure

You should respond in JSON format:
{{
  "thought": "Your reasoning about what to do next",
  "action": "execute_code" | "search_columns" | "get_sample" | "synthesize",
  "action_input": {{...}},
  "ready_to_answer": true/false
}}

If you have gathered enough information, set action="synthesize" and ready_to_answer=true.
"""
    
    try:
        response = think_complete(
            messages=[{"role": "user", "content": context}],
            system_prompt="You are a meticulous planning agent. Think step-by-step.",
            temperature=0.7,
            max_tokens=1000
        )
        
        # Parse response
        logger.info(f"Planner response: {response[:500]}")
        
        # Extract JSON
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            plan = json.loads(json_match.group())
        else:
            plan = {"thought": response, "action": "synthesize", "ready_to_answer": True}
        
        # Update state
        thoughts.append(plan.get("thought", ""))
        
        if plan.get("ready_to_answer") or iteration >= max_iter - 1:
            # Ready to synthesize
            return {
                **state,
                "thoughts": thoughts,
                "iteration": iteration + 1,
                "next_action": "synthesize"
            }
        else:
            # Need to execute a tool
            action = plan.get("action", "synthesize")
            if action in ["execute_code", "search_columns", "get_sample"]:
                return {
                    **state,
                    "thoughts": thoughts,
                    "iteration": iteration + 1,
                    "next_action": "execute_tool",
                    "pending_tool": {
                        "name": action,
                        "input": plan.get("action_input", {})
                    }
                }
            else:
                return {
                    **state,
                    "thoughts": thoughts,
                    "iteration": iteration + 1,
                    "next_action": "synthesize"
                }
    
    except Exception as e:
        logger.error(f"Planning error: {e}")
        return {
            **state,
            "thoughts": thoughts + [f"Error: {e}"],
            "next_action": "synthesize"
        }


def tool_executor_node(state: AgentState) -> AgentState:
    """Execute the pending tool."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from code_agent.generator import generate_and_execute_code
    from context_manager.registry import get_registry
    
    pending_tool = state.get("pending_tool")
    if not pending_tool:
        return {**state, "next_action": "plan"}
    
    tool_name = pending_tool["name"]
    tool_input = pending_tool["input"]
    
    logger.info(f"🔧 Executing tool: {tool_name}")
    logger.info(f"   Input: {tool_input}")
    
    tool_calls = state.get("tool_calls", [])
    tool_results = state.get("tool_results", [])
    
    try:
        registry = get_registry()
        
        if tool_name == "execute_code":
            # Use code agent as a tool
            description = tool_input.get("description", "")
            requirements = tool_input.get("requirements", {})
            
            result = generate_and_execute_code(
                task_description=description,
                requirements=requirements,
                session_id=state["session_id"]
            )
            
            tool_calls.append({"tool": tool_name, "input": tool_input})
            tool_results.append({
                "tool": tool_name,
                "success": result.get("success", False),
                "data": result.get("data"),
                "charts": result.get("charts"),
                "error": result.get("error")
            })
        
        elif tool_name == "search_columns":
            search_query = tool_input.get("search_query", "")
            results = registry.search_columns(search_query, top_k=5)
            
            tool_calls.append({"tool": tool_name, "input": tool_input})
            tool_results.append({
                "tool": tool_name,
                "results": results
            })
        
        elif tool_name == "get_sample":
            dataset_id = tool_input.get("dataset_id")
            limit = tool_input.get("limit", 10)
            sample = registry.get_sample(dataset_id, limit=limit)
            
            tool_calls.append({"tool": tool_name, "input": tool_input})
            tool_results.append({
                "tool": tool_name,
                "sample": sample
            })
        
        logger.info(f"✅ Tool executed successfully")
    
    except Exception as e:
        logger.error(f"❌ Tool execution error: {e}")
        tool_results.append({
            "tool": tool_name,
            "error": str(e)
        })
    
    return {
        **state,
        "tool_calls": tool_calls,
        "tool_results": tool_results,
        "pending_tool": None,
        "next_action": "plan"  # Go back to planner
    }


def synthesis_node(state: AgentState) -> AgentState:
    """Synthesize final response from all gathered information."""
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from llm.groq_client import think_complete
    
    query = state["query"]
    thoughts = state.get("thoughts", [])
    tool_results = state.get("tool_results", [])
    
    logger.info("📝 Synthesizing final response...")
    
    context = f"""
You gathered information to answer this query: {query}

Your reasoning:
{chr(10).join(thoughts)}

Results from tools:
{json.dumps(tool_results, indent=2)}

Now provide a clear, concise answer to the user. If you generated charts/data, describe them.
If you couldn't complete the task, explain why and suggest alternatives.
"""
    
    try:
        response = think_complete(
            messages=[{"role": "user", "content": context}],
            system_prompt="You are a helpful data analyst. Provide clear, actionable insights.",
            temperature=0.7,
            max_tokens=800
        )
        
        # Extract artifacts (charts/tables) from tool results
        artifacts = []
        for result in tool_results:
            if result.get("charts"):
                artifacts.extend(result["charts"])
            if result.get("data"):
                artifacts.append({
                    "type": "data",
                    "data": result["data"]
                })
        
        return {
            **state,
            "response": response,
            "artifacts": artifacts,
            "suggestions": [
                "Show me more details",
                "Try a different analysis",
                "Export this data"
            ],
            "next_action": "end"
        }
    
    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        return {
            **state,
            "response": f"I encountered an error synthesizing the response: {e}",
            "artifacts": [],
            "suggestions": [],
            "next_action": "end"
        }


# ─── Graph ────────────────────────────────────────────────────────────────────

def build_graph():
    """Build the ReAct graph."""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("planner", planner_node)
    workflow.add_node("tool_executor", tool_executor_node)
    workflow.add_node("synthesizer", synthesis_node)
    
    # Entry point
    workflow.set_entry_point("planner")
    
    # Routing
    def route_from_planner(state: AgentState) -> str:
        action = state.get("next_action", "end")
        return action if action != "plan" else "end"
    
    workflow.add_conditional_edges(
        "planner",
        route_from_planner,
        {
            "execute_tool": "tool_executor",
            "synthesize": "synthesizer",
            "end": END
        }
    )
    
    # Tool executor always goes back to planner
    workflow.add_edge("tool_executor", "planner")
    
    # Synthesizer ends
    workflow.add_edge("synthesizer", END)
    
    return workflow.compile()


# ─── API ──────────────────────────────────────────────────────────────────────

_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


async def run_agent(query: str, session_id: str, conversation_history: List[Dict] = None):
    """Run the agent."""
    graph = get_graph()
    
    initial_state: AgentState = {
        "query": query,
        "session_id": session_id,
        "conversation_history": conversation_history or [],
        "thoughts": [],
        "tool_calls": [],
        "tool_results": [],
        "iteration": 0,
        "max_iterations": 5,
        "response": "",
        "artifacts": [],
        "suggestions": [],
        "next_action": "plan",
        "pending_tool": None
    }
    
    try:
        final_state = await graph.ainvoke(initial_state)
    except AttributeError:
        import asyncio
        final_state = await asyncio.get_event_loop().run_in_executor(
            None, lambda: graph.invoke(initial_state)
        )
    
    return {
        "response": final_state.get("response", ""),
        "artifacts": final_state.get("artifacts", []),
        "suggestions": final_state.get("suggestions", [])
    }
