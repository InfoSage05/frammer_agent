"""
agent/orchestrator.py
======================
Main Orchestrator — Hybrid Agentic Recommendation Engine
---------------------------------------------------------
Builds a LangGraph ReAct agent that:
  • Is driven by ChatGroq (Llama-3.3-70b-versatile, same LLM as the rest of gc26)
  • Has access to the three specialised tools:
        get_kpis | get_model_recommendations | query_dataset
  • Is instructed (via SYSTEM_PROMPT) to follow the strict 5-step workflow
  • Can stream intermediate reasoning steps to the caller

Public API
----------
    from backend.rec_engine.agent.orchestrator import run_recommendation_agent

    async for chunk in run_recommendation_agent("user_042", stream=True):
        print(chunk, end="", flush=True)

    # or synchronous:
    result = run_recommendation_agent("user_042", stream=False)
    print(result)
"""

from __future__ import annotations

import logging
import os
from datetime import date
from typing import AsyncIterator, Iterator, Union

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

from .prompts import SYSTEM_PROMPT, TASK_PROMPT_TEMPLATE
from ..tools import get_kpis, query_dataset, get_model_recommendations

load_dotenv(override=True)
logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

# Model selection — must match the GROQ_MODEL in .env or falls back to this default.
# Swap to "mixtral-8x7b-32768" for higher context window if item lists grow large.
_GROQ_MODEL    = "llama-3.3-70b-versatile"  # Hardcoded to prevent shell overrides
_GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
_TEMPERATURE   = 0.0        # deterministic — reproducible re-ranking decisions
_MAX_TOKENS    = 4096       # enough for tool calls + final recommendation table

# ─── Tool list ────────────────────────────────────────────────────────────────

_TOOLS = [get_kpis, get_model_recommendations, query_dataset]


# ─── Agent factory ────────────────────────────────────────────────────────────

def _build_agent():
    """
    Constructs the LangGraph ReAct agent with the LLM and all tools bound.

    Returns the compiled graph (callable as agent.invoke / agent.stream).
    Lazy-initialised once and cached in the module.

    Production customisation
    ------------------------
    * To add memory / multi-turn conversation, pass a checkpointer:
          from langgraph.checkpoint.memory import MemorySaver
          agent = create_react_agent(llm, _TOOLS, checkpointer=MemorySaver())
    * To add guardrails, wrap the LLM with Nemo Guardrails or a custom
      RunnableLambda before passing it here.
    * To swap the LLM to GPT-4o:
          from langchain_openai import ChatOpenAI
          llm = ChatOpenAI(model="gpt-4o", temperature=0)
    * To use a local model via Ollama:
          from langchain_ollama import ChatOllama
          llm = ChatOllama(model="llama3.3:70b", temperature=0)
    """
    if not _GROQ_API_KEY:
        raise EnvironmentError(
            "GROQ_API_KEY is not set. Add it to .env or export it as an environment variable."
        )

    llm = ChatGroq(
        model       = _GROQ_MODEL,
        temperature = _TEMPERATURE,
        max_tokens  = _MAX_TOKENS,
        api_key     = _GROQ_API_KEY,
    )

    # create_react_agent from langgraph.prebuilt:
    # - Automatically formats tools as JSON function-call schemas
    # - Handles the tool-call ↔ tool-result message loop
    # - Terminates when the LLM emits a final message (no more tool calls)
    agent = create_react_agent(
        model = llm,
        tools = _TOOLS,
    )

    logger.info(
        "ReAct agent built: model=%s | tools=%s",
        _GROQ_MODEL,
        [t.name for t in _TOOLS],
    )
    return agent


# Cache the compiled graph (avoid rebuilding on every request)
_AGENT = None


def _get_agent():
    global _AGENT
    if _AGENT is None:
        _AGENT = _build_agent()
    return _AGENT


# ─── Public API ──────────────────────────────────────────────────────────────

def run_recommendation_agent(
    user_id: str,
    stream: bool = True,
) -> Union[str, Iterator[str]]:
    """
    Run the Recommendation Agent for the given user.

    Parameters
    ----------
    user_id : str
        The user to generate recommendations for (e.g. "user_042").
    stream  : bool
        If True, returns a *synchronous* iterator of string chunks so you
        can print reasoning steps in real time.
        If False, blocks until completion and returns the full final answer.

    Returns
    -------
    str | Iterator[str]
        The final recommendation table (+ scoring commentary) from the agent.

    Examples
    --------
    Streaming:
        for chunk in run_recommendation_agent("user_042", stream=True):
            print(chunk, end="", flush=True)

    Synchronous:
        result = run_recommendation_agent("user_042", stream=False)
    """
    agent = _get_agent()

    task_prompt = TASK_PROMPT_TEMPLATE.format(
        user_id = user_id,
        date    = date.today().isoformat(),
    )

    inputs = {
        "messages": [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=task_prompt)
        ],
    }

    logger.info("Starting recommendation agent for user_id=%s", user_id)

    if stream:
        return _stream_agent(agent, inputs)
    else:
        return _invoke_agent(agent, inputs)


def _invoke_agent(agent, inputs: dict) -> str:
    """Blocking invocation — returns only the final assistant message."""
    result = agent.invoke(inputs)
    messages = result.get("messages", [])
    # The last message is always the final AI response
    for msg in reversed(messages):
        if hasattr(msg, "content") and msg.content:
            return msg.content
    return "Agent returned an empty response."


def _stream_agent(agent, inputs: dict) -> Iterator[str]:
    """
    Yields string chunks as the agent reasons and calls tools.
    Emits formatted sections so the terminal output is readable:
      [THINKING] → agent reasoning
      [TOOL: name] → tool invocations with arguments
      [RESULT] → tool output snippets
      (no prefix) → final recommendation output
    """
    final_messages_seen = set()

    for event in agent.stream(inputs, stream_mode="updates"):
        for node_name, node_output in event.items():
            messages = node_output.get("messages", [])
            for msg in messages:
                msg_id = id(msg)
                if msg_id in final_messages_seen:
                    continue
                final_messages_seen.add(msg_id)

                msg_type = type(msg).__name__

                # ── AI reasoning / final answer ────────────────────────────────
                if msg_type == "AIMessage":
                    # Tool calls (the LLM decided to call a tool)
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        for tc in msg.tool_calls:
                            args_preview = str(tc.get("args", {}))[:120]
                            yield f"\n[TOOL: {tc['name']}] args={args_preview}\n"
                    # Content (final answer or CoT text)
                    elif msg.content:
                        yield f"\n{msg.content}\n"

                # ── Tool result ────────────────────────────────────────────────
                elif msg_type == "ToolMessage":
                    preview = (msg.content or "")[:200].replace("\n", " ")
                    yield f"[RESULT from {msg.name}]: {preview}…\n"
