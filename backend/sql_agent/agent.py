"""
agent.py — LangGraph ReAct SQL Agent

Architecture:
    ┌─────────┐     tool calls      ┌──────────┐
    │  Reason │ ──────────────────► │  Act     │
    │ (LLM)   │ ◄────────────────── │ (Tools)  │
    └─────────┘   tool results      └──────────┘
         │ "no more tools"
         ▼
    ┌─────────┐
    │ Respond │   final answer to caller
    └─────────┘

The agent uses llama-3.3-70b-versatile (THINK_MODEL) as the reasoning backbone.
It has access to: list_datasets, get_schema, run_sql_query, get_full_dataset
"""

import sys
import logging
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

# ── path bootstrap ────────────────────────────────────────────────────────────
_sql_agent_dir = Path(__file__).parent
_backend_dir = _sql_agent_dir.parent
_root_dir = _backend_dir.parent
for p in [str(_backend_dir), str(_root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import Annotated, TypedDict

from .database import init_db, get_full_meta
from .tools import ALL_TOOLS

logger = logging.getLogger("sql_agent.agent")

# ── LLM setup ────────────────────────────────────────────────────────────────
import os
from dotenv import load_dotenv

# Load env from project root
_env_path = _root_dir / ".env"
load_dotenv(_env_path)
_api_key = os.getenv("GROQ_API_KEY", "")

THINK_MODEL = "llama-3.3-70b-versatile"


def _build_llm():
    if not _api_key:
        raise ValueError("GROQ_API_KEY not set — check your .env file")
    return ChatGroq(
        model=THINK_MODEL,
        api_key=_api_key,
        temperature=0.2,
        max_tokens=4096,
    ).bind_tools(ALL_TOOLS)


# ── State definition ──────────────────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    query: str
    datasets_context: str


# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a data analyst AI with direct access to a SQL database containing multiple datasets.

Your job: answer the user's question by querying the database using your tools.

STEP-BY-STEP APPROACH (ALWAYS follow this order):
1. Call `list_datasets` FIRST to see what tables and columns exist.
2. Call `get_schema` for any table you plan to query — verify exact column names.
3. Write a precise SQL SELECT query using the EXACT table and column names you discovered.
4. Call `run_sql_query` with your SQL. Check `valid` field — if false, fix the SQL and retry.
5. If the user wants the complete dataset, call `get_full_dataset`.
6. Synthesise the results into a clear, concise answer.

RULES:
- Only SELECT queries are allowed — no INSERT/UPDATE/DROP etc.
- Table/column names are lowercase with underscores (e.g. "monthly_chart", not "monthly-chart").
- Always validate the query succeeded (check `valid: true` in the response).
- If a query returns 0 rows, try a different approach or a simpler query.
- Answer in Markdown. Include key numbers in your answer.
- If the user asks to "list datasets", just call list_datasets and format the result nicely.
- Available tables are given in the context below; use them as a starting point."""


def _build_datasets_context() -> str:
    """Build a compact table-of-tables context string."""
    try:
        meta = get_full_meta()
        lines = ["**Available Tables:**\n"]
        for m in meta.values():
            cols_preview = ", ".join(m["columns"][:8])
            if len(m["columns"]) > 8:
                cols_preview += f", ... (+{len(m['columns']) - 8} more)"
            lines.append(f"- `{m['table_name']}` ({m['row_count']} rows) | columns: {cols_preview}")
        return "\n".join(lines)
    except Exception:
        return ""


# ── Graph nodes ───────────────────────────────────────────────────────────────

def reason_node(state: AgentState) -> dict:
    """ReAct: let the LLM decide whether to call a tool or produce a final answer."""
    llm = _build_llm()

    msgs: List[BaseMessage] = state["messages"]
    datasets_context = state.get("datasets_context", "")

    # Prepend system + context (only on first call — avoid duplication)
    if not any(isinstance(m, SystemMessage) for m in msgs):
        system_content = SYSTEM_PROMPT
        if datasets_context:
            system_content += f"\n\n{datasets_context}"
        msgs = [SystemMessage(content=system_content)] + list(msgs)

    logger.debug(f"reason_node: {len(msgs)} messages")
    response = llm.invoke(msgs)
    logger.debug(f"LLM response: {str(response)[:200]}")
    return {"messages": [response]}


def should_continue(state: AgentState) -> Literal["tools", END]:
    """Edge: if last message has tool calls → go to tools, else finish."""
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return END


# ── Build the graph ───────────────────────────────────────────────────────────

def _build_graph() -> Any:
    tool_node = ToolNode(ALL_TOOLS)

    graph = StateGraph(AgentState)
    graph.add_node("reason", reason_node)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("reason")
    graph.add_conditional_edges("reason", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "reason")  # loop back after tool execution

    return graph.compile()


_compiled_graph = None


def _get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = _build_graph()
    return _compiled_graph


# ── Public API ────────────────────────────────────────────────────────────────

def run_sql_agent(query: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Run the LangGraph ReAct SQL agent for a given query.

    Args:
        query: Natural language or SQL question about the datasets.
        session_id: Optional session identifier (for logging).

    Returns:
        {
            "answer": str,          # Final natural language answer
            "rows": list,           # Last SQL result rows (if any)
            "sql_used": str,        # Last SQL query executed (if any)
            "datasets_used": list,  # Table names touched
            "success": bool,
            "error": str | None,
        }
    """
    logger.info(f"run_sql_agent: query='{query[:80]}' session={session_id}")

    # Ensure DB is ready
    try:
        init_db()
    except Exception as e:
        return {"answer": f"Failed to initialise database: {e}", "success": False, "error": str(e)}

    datasets_context = _build_datasets_context()

    initial_state: AgentState = {
        "messages": [HumanMessage(content=query)],
        "query": query,
        "datasets_context": datasets_context,
    }

    try:
        graph = _get_graph()
        final_state = graph.invoke(initial_state, config={"recursion_limit": 20})
    except Exception as e:
        logger.error(f"Graph execution error: {e}", exc_info=True)
        return {"answer": f"Agent error: {e}", "success": False, "error": str(e)}

    # ── Extract final answer ──────────────────────────────────────────────────
    messages = final_state.get("messages", [])
    answer = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and not msg.tool_calls:
            answer = msg.content
            break

    if not answer:
        answer = "The agent finished but produced no final text response."

    # ── Extract metadata from tool messages ───────────────────────────────────
    rows: list = []
    sql_used: str = ""
    datasets_used: list = []

    import json as _json
    for msg in messages:
        if isinstance(msg, ToolMessage):
            try:
                payload = _json.loads(msg.content)
                if isinstance(payload, dict):
                    if payload.get("rows"):
                        rows = payload["rows"]
                    if payload.get("sql"):
                        sql_used = payload["sql"]
                elif isinstance(payload, list):
                    # list_datasets response
                    for item in payload:
                        if isinstance(item, dict) and item.get("table_name"):
                            datasets_used.append(item["table_name"])
            except Exception:
                pass

    logger.info(f"Agent done: answer={answer[:80]}, rows={len(rows)}, sql={sql_used[:60]}")

    return {
        "answer": answer,
        "rows": rows,
        "sql_used": sql_used,
        "datasets_used": list(set(datasets_used)),
        "success": True,
        "error": None,
    }
