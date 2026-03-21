"""
Explanation Agent
Explains the user's query without running analytics or planner execution.
"""
import json
import re
import logging
from typing import Dict, Any

from llm.groq_client import fast_complete, think_complete

logger = logging.getLogger("explanation_agent")


def _heuristic_route(query: str) -> str:
    q = query.lower()

    explain_triggers = [
        "explain",
        "what does",
        "what do you mean",
        "clarify",
        "rephrase",
        "summarize my question",
        "paraphrase",
        "meaning of",
        "interpret",
    ]

    analyze_triggers = [
        "chart",
        "plot",
        "graph",
        "show me",
        "compare",
        "trend",
        "forecast",
        "by ",
        "top ",
        "bottom ",
        "count",
        "total",
        "average",
        "sum",
        "median",
        "max",
        "min",
        "dataset",
        "columns",
        "schema",
        "list datasets",
        "available data",
        "kpi",
        "metric",
        "analysis",
        "analyze",
        "correlation",
        "distribution",
    ]

    if any(t in q for t in analyze_triggers):
        return "analyze"
    if any(t in q for t in explain_triggers):
        return "explain"

    return "analyze"


def classify_route(query: str, conversation_context: str = "") -> Dict[str, Any]:
    """Classify whether to explain the query or run analytics."""
    context_section = ""
    if conversation_context:
        context_section = f"\nRECENT CONTEXT:\n{conversation_context}\n"

    prompt = f"""Decide whether the user wants an explanation of the query (no analytics),
    or a data analysis/visualization (analytics required).

    Rules:
    - Use 'explain' when the user asks to interpret, clarify, or explain a question or results.
    - Use 'analyze' when the user asks for counts, comparisons, charts, datasets, KPIs, or trends.
    - Use context to resolve references to prior results.

    {context_section}
    USER QUERY: {query}

    Respond with JSON only:
    {{
        "route": "explain" | "analyze",
        "reason": "short reason",
        "confidence": 0.0
    }}"""

    response = fast_complete([{"role": "user", "content": prompt}], temperature=0.1)
    raw = response.strip()

    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            route = data.get("route", "").strip().lower()
            if route in ("explain", "analyze"):
                return {
                    "route": route,
                    "reason": data.get("reason", ""),
                    "confidence": data.get("confidence", 0.0),
                }
    except Exception as e:
        logger.debug(f"Route classifier parse failed: {e}")

    fallback = _heuristic_route(query)
    return {"route": fallback, "reason": "heuristic fallback", "confidence": 0.0}


def explain_query(query: str, conversation_context: str = "") -> Dict[str, Any]:
    """Explain the user query without running analytics or charts."""
    try:
        from kpi_agent import classify_kpi, answer_kpi_query
        kpi_decision = classify_kpi(query, conversation_context=conversation_context)
        if kpi_decision.get("match") and float(kpi_decision.get("confidence", 0.0)) >= 0.7:
            return answer_kpi_query(query, conversation_context=conversation_context)
    except Exception as e:
        logger.debug(f"KPI agent unavailable: {e}")
    context_section = ""
    if conversation_context:
        context_section = f"\nRECENT CONTEXT:\n{conversation_context}\n"

    system_prompt = (
        "You are a query-explanation assistant. "
        "Explain what the user is asking in plain language. "
        "Do not run analytics or claim results. "
        "If context is provided, resolve references like 'this' or 'that'."
    )

    prompt = f"""Explain the user's request in 2-5 sentences.
    If important details are missing (time range, metric, dataset), mention them briefly.
    Keep it clear and neutral.

    {context_section}
    USER QUERY: {query}
    """

    response = think_complete(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.4,
        max_tokens=600,
    )

    return {
        "answer": response.strip(),
        "artifacts": [],
        "datasets_used": [],
        "suggestions": [],
    }
