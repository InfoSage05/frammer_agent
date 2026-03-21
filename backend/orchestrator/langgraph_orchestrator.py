"""
LangGraph orchestrator for chat routing.
"""
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import StateGraph, END


class ChatState(TypedDict, total=False):
    query: str
    conversation_context: str
    forced_route: str
    route: str
    visualize_intent: bool
    kpi_decision: Dict[str, Any]
    result: Dict[str, Any]


def _route_query(state: ChatState) -> ChatState:
    query = state.get("query", "")
    context = state.get("conversation_context", "")
    forced_route = (state.get("forced_route") or "").lower().strip()

    if forced_route:
        if forced_route == "analytics":
            forced_route = "analyze"
        allowed = {"explain", "kpi", "analyze", "summary", "recommend"}
        if forced_route in allowed:
            return {
                "route": forced_route,
                "kpi_decision": {"match": False, "kpi_id": "", "confidence": 0.0},
                "visualize_intent": False,
            }

    from planner import classify_task, TaskType
    from explanation_agent import classify_route
    from kpi_agent import classify_kpi
    from recommendation_agent import should_run as should_run_recs
    from analytics_summary_agent import should_run as should_run_summary

    task_type = classify_task(query)
    if task_type == TaskType.GREETING:
        return {
            "route": "analyze",
            "kpi_decision": {"match": False, "kpi_id": "", "confidence": 0.0},
            "visualize_intent": False,
        }

    route_decision = classify_route(query, conversation_context=context)
    route = route_decision.get("route", "analyze")
    kpi_decision = classify_kpi(query, conversation_context=context)

    visualize_intent = any(
        t in query.lower()
        for t in ["chart", "plot", "graph", "visualize", "show me"]
    )

    if route == "explain":
        resolved_route = "explain"
    elif should_run_summary(query, conversation_context=context):
        resolved_route = "summary"
    elif should_run_recs(query, conversation_context=context):
        resolved_route = "recommend"
    elif kpi_decision.get("match") and float(kpi_decision.get("confidence", 0.0)) >= 0.6:
        resolved_route = "kpi"
    else:
        resolved_route = "analyze"

    return {
        "route": resolved_route,
        "kpi_decision": kpi_decision,
        "visualize_intent": visualize_intent,
    }


def _explain_node(state: ChatState) -> ChatState:
    from explanation_agent import explain_query
    result = explain_query(state.get("query", ""), conversation_context=state.get("conversation_context", ""))
    return {"result": result}


def _recommend_node(state: ChatState) -> ChatState:
    from recommendation_agent import answer_recommendations
    result = answer_recommendations(state.get("query", ""), conversation_context=state.get("conversation_context", ""))
    return {"result": result}


def _summary_node(state: ChatState) -> ChatState:
    from analytics_summary_agent import answer_summary
    result = answer_summary(state.get("query", ""), conversation_context=state.get("conversation_context", ""))
    return {"result": result}


def _kpi_node(state: ChatState) -> ChatState:
    from kpi_agent import answer_kpi_query
    result = answer_kpi_query(state.get("query", ""), conversation_context=state.get("conversation_context", ""))
    return {"result": result}


def _planner_node(state: ChatState) -> ChatState:
    from planner import run_planner
    result = run_planner(state.get("query", ""), conversation_context=state.get("conversation_context", ""))
    return {"result": result}


def _combine_kpi_viz(state: ChatState) -> ChatState:
    from planner import run_planner
    from kpi_agent import answer_kpi_query

    planner_result = run_planner(state.get("query", ""), conversation_context=state.get("conversation_context", ""))
    kpi_result = answer_kpi_query(state.get("query", ""), conversation_context=state.get("conversation_context", ""))

    combined_answer = planner_result.get("answer", "")
    kpi_payload = kpi_result.get("kpi") or {}
    kpi_name = kpi_payload.get("name") or "KPI"
    kpi_value = kpi_payload.get("formatted") or kpi_payload.get("value")
    kpi_desc = kpi_payload.get("description") or ""
    if kpi_value is not None:
        kpi_line = f"{kpi_name}: {kpi_value}"
        if kpi_desc:
            kpi_line += f". {kpi_desc}"
        combined_answer = f"{combined_answer}\n\nKPI highlights: {kpi_line}"

    datasets_used = list({*(planner_result.get("datasets_used", [])), *(kpi_result.get("datasets_used", []))})

    result = {
        "answer": combined_answer.strip(),
        "artifacts": planner_result.get("artifacts", []),
        "datasets_used": datasets_used,
        "suggestions": planner_result.get("suggestions", []),
    }
    return {"result": result}


def _route_to_node(state: ChatState) -> str:
    route = state.get("route", "analyze")
    if route == "explain":
        return "explain"
    if route == "summary":
        return "summary"
    if route == "recommend":
        return "recommend"
    if route == "kpi":
        return "kpi_or_combo"
    return "planner"


def _route_kpi_combo(state: ChatState) -> str:
    if state.get("visualize_intent"):
        return "combine"
    return "kpi"


def build_graph():
    graph = StateGraph(ChatState)

    graph.add_node("route", _route_query)
    graph.add_node("explain", _explain_node)
    graph.add_node("summary", _summary_node)
    graph.add_node("recommend", _recommend_node)
    graph.add_node("kpi", _kpi_node)
    graph.add_node("planner", _planner_node)
    graph.add_node("combine", _combine_kpi_viz)

    graph.set_entry_point("route")

    graph.add_conditional_edges("route", _route_to_node, {
        "explain": "explain",
        "summary": "summary",
        "recommend": "recommend",
        "kpi_or_combo": "kpi",
        "planner": "planner",
    })

    graph.add_conditional_edges("kpi", _route_kpi_combo, {
        "combine": "combine",
        "kpi": END,
    })

    graph.add_edge("explain", END)
    graph.add_edge("summary", END)
    graph.add_edge("recommend", END)
    graph.add_edge("planner", END)
    graph.add_edge("combine", END)

    return graph.compile()


_GRAPH = None


def run_chat_graph(query: str, conversation_context: str = "", forced_route: str = "") -> Dict[str, Any]:
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_graph()

    state: ChatState = {
        "query": query,
        "conversation_context": conversation_context,
        "forced_route": forced_route,
    }
    output = _GRAPH.invoke(state)
    return {
        "result": output.get("result", {}),
        "route": output.get("route", "analyze"),
        "kpi_decision": output.get("kpi_decision", {}),
        "visualize_intent": output.get("visualize_intent", False),
    }
