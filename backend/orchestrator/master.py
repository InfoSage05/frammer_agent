"""
Master Orchestrator - LangGraph-based thinking orchestrator

This is the brain that:
1. Understands what user is asking
2. Creates a TODO list of steps
3. Executes each step with the right agent
4. Tracks progress and synthesizes final response
"""
import sys
import json
import re
import logging
from pathlib import Path
from typing import TypedDict, List, Dict, Any, Optional, Annotated
from dataclasses import dataclass, field
import operator

_backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_backend_dir.parent))

from langgraph.graph import StateGraph, END
from llm.groq_client import fast_complete, think_complete
from dbms import list_datasets, get_schema
from agents import get_agent

logger = logging.getLogger("orchestrator.master")


# ─── State Definition ────────────────────────────────────────────────────────

class MasterState(TypedDict):
    """State passed through the orchestrator graph"""
    # Input
    query: str
    session_id: str
    conversation_context: str
    
    # Understanding
    understanding: str
    query_type: str  # simple_response | needs_work
    should_plot: bool
    
    # TODO List
    todo_list: List[Dict[str, Any]]
    current_step: int
    
    # Execution
    step_results: Annotated[List[Dict[str, Any]], operator.add]
    
    # Output
    response: str
    artifacts: List[Dict[str, Any]]
    datasets_used: List[str]
    suggestions: List[str]
    progress_messages: List[str]
    error: Optional[str]


# ─── Node Functions ──────────────────────────────────────────────────────────

def think_and_understand(state: MasterState) -> MasterState:
    """
    THINK Node: Understand what user is asking and classify the query
    """
    query = state["query"]
    conversation_context = state.get("conversation_context", "")
    
    # Get available datasets for context
    datasets = list_datasets()
    dataset_info = "\n".join([f"- {d['name']}: {d['columns'][:8]}" for d in datasets[:5]])
    
    prompt = f"""You are analyzing a user query to understand what they need.

USER QUERY: "{query}"

CONVERSATION HISTORY:
{conversation_context if conversation_context else "None"}

AVAILABLE DATASETS:
{dataset_info if dataset_info else "None"}

Analyze and respond with JSON only:
{{
    "understanding": "Brief description of what user wants",
    "query_type": "simple_response" or "needs_work",
    "should_plot": true/false (true ONLY if user explicitly asks for chart/plot/graph OR if visualization would significantly help understand the data),
    "reasoning": "Why you classified it this way"
}}

RULES for query_type:
- "simple_response": Greetings, help questions, general chat, simple factual questions
- "needs_work": Data analysis, computations, comparisons, trends, any query needing dataset access

RULES for should_plot:
- true: User says "plot", "chart", "graph", "visualize", "show me" OR complex comparisons that need visual aid
- false: Simple counts, single metrics, listings, greetings"""

    response = fast_complete([{"role": "user", "content": prompt}], temperature=0.1)
    
    try:
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            data = json.loads(match.group())
            logger.info(f"Understanding: {data.get('understanding', 'N/A')[:80]}")
            logger.info(f"Query type: {data.get('query_type')}, Should plot: {data.get('should_plot')}")
            
            return {
                **state,
                "understanding": data.get("understanding", query),
                "query_type": data.get("query_type", "needs_work"),
                "should_plot": data.get("should_plot", False),
                "progress_messages": ["🤔 Understanding your request..."]
            }
    except Exception as e:
        logger.warning(f"Failed to parse understanding: {e}")
    
    # Default to needs_work
    return {
        **state,
        "understanding": query,
        "query_type": "needs_work",
        "should_plot": False,
        "progress_messages": ["🤔 Understanding your request..."]
    }


def route_query(state: MasterState) -> str:
    """Route based on query type"""
    if state.get("query_type") == "simple_response":
        return "simple_response"
    return "needs_work"


def handle_simple_response(state: MasterState) -> MasterState:
    """Handle simple queries with greeting agent"""
    logger.info("Routing to greeting agent")
    
    agent = get_agent("greeting")
    result = agent.execute(
        task=state["query"],
        context={"conversation_context": state.get("conversation_context", "")}
    )
    
    return {
        **state,
        "response": result.response,
        "artifacts": [],
        "progress_messages": state.get("progress_messages", [])
    }


def create_todo_list(state: MasterState) -> MasterState:
    """
    PLAN Node: Create a TODO list of steps to solve the problem
    """
    query = state["query"]
    understanding = state.get("understanding", query)
    should_plot = state.get("should_plot", False)
    
    # Get dataset info
    datasets = list_datasets()
    dataset_info = ""
    for ds in datasets[:5]:
        try:
            schema = get_schema(ds["name"])
            cols = [f"{c['col_name']}" for c in schema[:10]]
            dataset_info += f"\n- {ds['name']}: {', '.join(cols)}"
        except:
            dataset_info += f"\n- {ds['name']}: {ds['columns'][:8]}"
    
    prompt = f"""You are planning how to solve a data analysis task.

TASK: {understanding}
ORIGINAL QUERY: {query}
SHOULD CREATE VISUALIZATION: {should_plot}

AVAILABLE DATASETS:{dataset_info}

Create a TODO list to solve this. Think step by step:
1. What data do I need?
2. What calculations/analysis?
3. How to present results?

Respond with JSON only:
{{
    "thinking": "Your reasoning about how to approach this",
    "todo": [
        {{
            "step": 1,
            "task": "Clear description of what to do",
            "agent": "coding",
            "datasets_needed": ["dataset-name"],
            "depends_on": []
        }}
    ]
}}

RULES:
- Keep it simple: 1-3 steps for most queries
- Only use "coding" agent (it handles all data work)
- If visualization needed, include it as part of the final step
- Each step should be independently executable"""

    response = think_complete([{"role": "user", "content": prompt}], temperature=0.2)
    
    try:
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            data = json.loads(match.group())
            todo_list = data.get("todo", [])
            
            # Add status to each item
            for item in todo_list:
                item["status"] = "pending"
                item["result"] = None
            
            logger.info(f"Created TODO with {len(todo_list)} steps")
            for item in todo_list:
                logger.info(f"  Step {item['step']}: {item['task'][:60]}")
            
            progress = state.get("progress_messages", [])
            progress.append(f"📋 Planning: {len(todo_list)} step(s) to complete")
            
            return {
                **state,
                "todo_list": todo_list,
                "current_step": 0,
                "progress_messages": progress
            }
    except Exception as e:
        logger.warning(f"Failed to parse TODO: {e}")
    
    # Default: single step
    default_todo = [{
        "step": 1,
        "task": understanding,
        "agent": "coding",
        "datasets_needed": [],
        "depends_on": [],
        "status": "pending",
        "result": None
    }]
    
    return {
        **state,
        "todo_list": default_todo,
        "current_step": 0,
        "progress_messages": state.get("progress_messages", []) + ["📋 Planning: 1 step to complete"]
    }


def execute_step(state: MasterState) -> MasterState:
    """Execute the current TODO step"""
    todo_list = state.get("todo_list", [])
    current_step = state.get("current_step", 0)
    
    if current_step >= len(todo_list):
        return state
    
    step = todo_list[current_step]
    step_num = step.get("step", current_step + 1)
    task = step.get("task", "")
    agent_name = step.get("agent", "coding")
    
    logger.info(f"Executing step {step_num}: {task[:60]}")
    
    # Update progress
    progress = state.get("progress_messages", [])
    progress.append(f"⚙️ Step {step_num}: {task[:50]}...")
    
    # Get previous results for dependent steps
    previous_results = []
    depends_on = step.get("depends_on", [])
    for dep_step in depends_on:
        for completed in state.get("step_results", []):
            if completed.get("step") == dep_step:
                previous_results.append(completed)
    
    # Determine if this step should plot
    is_last_step = current_step == len(todo_list) - 1
    should_plot = state.get("should_plot", False) and is_last_step
    
    # Execute with appropriate agent
    try:
        agent = get_agent(agent_name)
        
        # Pass should_plot to coding agent
        if agent_name == "coding":
            result = agent.execute(
                task=task,
                context={"conversation_context": state.get("conversation_context", "")},
                previous_results=previous_results,
                should_plot=should_plot
            )
        else:
            result = agent.execute(
                task=task,
                context={"conversation_context": state.get("conversation_context", "")},
                previous_results=previous_results
            )
        
        # Store result
        step_result = {
            "step": step_num,
            "task": task,
            "success": result.success,
            "response": result.response,
            "data": result.data,
            "artifacts": result.artifacts,
            "datasets_used": result.datasets_used
        }
        
        # Update TODO item
        todo_list[current_step]["status"] = "done" if result.success else "failed"
        todo_list[current_step]["result"] = step_result
        
        progress.append(f"✓ Step {step_num} complete")
        
        return {
            **state,
            "todo_list": todo_list,
            "current_step": current_step + 1,
            "step_results": [step_result],
            "progress_messages": progress
        }
        
    except Exception as e:
        logger.error(f"Step {step_num} failed: {e}")
        
        step_result = {
            "step": step_num,
            "task": task,
            "success": False,
            "error": str(e)
        }
        
        todo_list[current_step]["status"] = "failed"
        progress.append(f"✗ Step {step_num} failed")
        
        return {
            **state,
            "todo_list": todo_list,
            "current_step": current_step + 1,
            "step_results": [step_result],
            "error": str(e),
            "progress_messages": progress
        }


def check_more_steps(state: MasterState) -> str:
    """Check if there are more steps to execute"""
    todo_list = state.get("todo_list", [])
    current_step = state.get("current_step", 0)
    
    if current_step < len(todo_list):
        return "more_steps"
    return "done"


def synthesize_response(state: MasterState) -> MasterState:
    """Combine all step results into final response"""
    step_results = state.get("step_results", [])
    query = state["query"]
    
    # Collect all artifacts
    all_artifacts = []
    all_datasets = []
    
    for result in step_results:
        if result.get("artifacts"):
            all_artifacts.extend(result["artifacts"])
        if result.get("datasets_used"):
            all_datasets.extend(result["datasets_used"])
    
    # If single step, use its response directly
    if len(step_results) == 1:
        final_response = step_results[0].get("response", "Analysis complete.")
    else:
        # Multiple steps: synthesize
        results_summary = ""
        for r in step_results:
            results_summary += f"\nStep {r.get('step')}: {r.get('response', 'No response')[:300]}\n"
        
        prompt = f"""Combine these analysis results into a clear, concise response.

ORIGINAL QUESTION: {query}

STEP RESULTS:
{results_summary}

Write a unified response that answers the user's question. Be concise but complete.
Include key numbers and insights. Don't mention "steps" - just present the findings naturally."""

        final_response = fast_complete([{"role": "user", "content": prompt}], temperature=0.3)
    
    # Generate suggestions
    suggestions = generate_suggestions(query, final_response, all_datasets)
    
    progress = state.get("progress_messages", [])
    progress.append("✅ Done!")
    
    return {
        **state,
        "response": final_response,
        "artifacts": all_artifacts,
        "datasets_used": list(set(all_datasets)),
        "suggestions": suggestions,
        "progress_messages": progress
    }


def generate_suggestions(query: str, response: str, datasets_used: list) -> list:
    """Generate follow-up suggestions"""
    prompt = f"""Based on this analysis, suggest 3 brief follow-up questions the user might ask.

Query: {query}
Response summary: {response[:300]}
Datasets used: {datasets_used}

Return JSON array of 3 short questions (under 10 words each):
["question1", "question2", "question3"]"""

    try:
        result = fast_complete([{"role": "user", "content": prompt}], temperature=0.5)
        match = re.search(r'\[.*\]', result, re.DOTALL)
        if match:
            return json.loads(match.group())[:3]
    except:
        pass
    
    return ["Show me more details", "Compare with other data", "Create a visualization"]


# ─── Build Graph ─────────────────────────────────────────────────────────────

def create_master_graph() -> StateGraph:
    """Create the master orchestrator graph"""
    
    workflow = StateGraph(MasterState)
    
    # Add nodes
    workflow.add_node("think", think_and_understand)
    workflow.add_node("simple_response", handle_simple_response)
    workflow.add_node("plan", create_todo_list)
    workflow.add_node("execute_step", execute_step)
    workflow.add_node("synthesize", synthesize_response)
    
    # Set entry point
    workflow.set_entry_point("think")
    
    # Add edges
    workflow.add_conditional_edges(
        "think",
        route_query,
        {
            "simple_response": "simple_response",
            "needs_work": "plan"
        }
    )
    
    workflow.add_edge("simple_response", END)
    workflow.add_edge("plan", "execute_step")
    
    workflow.add_conditional_edges(
        "execute_step",
        check_more_steps,
        {
            "more_steps": "execute_step",
            "done": "synthesize"
        }
    )
    
    workflow.add_edge("synthesize", END)
    
    return workflow


# ─── Public API ──────────────────────────────────────────────────────────────

_compiled_graph = None

def get_orchestrator():
    """Get compiled orchestrator graph (singleton)"""
    global _compiled_graph
    if _compiled_graph is None:
        workflow = create_master_graph()
        _compiled_graph = workflow.compile()
    return _compiled_graph


def run_orchestrator(
    query: str,
    session_id: str = "",
    conversation_context: str = ""
) -> dict:
    """
    Run the master orchestrator
    
    Args:
        query: User's question
        session_id: Session identifier
        conversation_context: Previous conversation for context
    
    Returns:
        {response, artifacts, suggestions, datasets_used, progress_messages}
    """
    logger.info("=" * 60)
    logger.info(f"ORCHESTRATOR START: {query[:80]}")
    logger.info("=" * 60)
    
    graph = get_orchestrator()
    
    initial_state: MasterState = {
        "query": query,
        "session_id": session_id,
        "conversation_context": conversation_context,
        "understanding": "",
        "query_type": "",
        "should_plot": False,
        "todo_list": [],
        "current_step": 0,
        "step_results": [],
        "response": "",
        "artifacts": [],
        "datasets_used": [],
        "suggestions": [],
        "progress_messages": [],
        "error": None
    }
    
    # Run the graph
    final_state = graph.invoke(initial_state)
    
    logger.info(f"ORCHESTRATOR END - Response: {final_state.get('response', '')[:100]}")
    logger.info("=" * 60)
    
    return {
        "response": final_state.get("response", ""),
        "artifacts": final_state.get("artifacts", []),
        "suggestions": final_state.get("suggestions", []),
        "datasets_used": final_state.get("datasets_used", []),
        "progress_messages": final_state.get("progress_messages", []),
        "error": final_state.get("error")
    }
