"""
Graph Nodes - Individual processing nodes for the LangGraph orchestrator.
Each node transforms state and returns updated state.
"""
import logging
from typing import Dict, Any, List
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from llm import fast_complete, think_complete
from context_manager import get_registry, get_retrieval
from code_agent.sandbox import execute_analysis
from narration import narrate_results, narrate_error, generate_follow_up_suggestions

# Set up logger
logger = logging.getLogger("frammer.orchestrator")


# ─── Intent Classification ───────────────────────────────────────────────────

INTENT_SYSTEM_PROMPT = """You are an intent classifier for a data analysis assistant.
Classify user queries into ONE of these categories:

1. "analysis" - Questions about data, metrics, comparisons, trends, aggregations
   Examples: "What is the publish rate?", "Compare channel A vs B", "Show monthly trends"

2. "visualization" - Requests for charts, plots, graphs, visual representations
   Examples: "Plot the funnel", "Create a bar chart of channels", "Visualize user activity"

3. "data_management" - Requests to upload, ingest, describe, or list datasets
   Examples: "Upload a new file", "What datasets are available?", "Describe the channel data"

4. "meta" - Questions about the system, capabilities, or general help
   Examples: "What can you do?", "How do I use this?", "Help"

Respond with ONLY the category name, nothing else."""


def route_intent(state: Dict[str, Any]) -> Dict[str, Any]:
    """Classify user intent and route to appropriate handler."""
    query = state.get("user_query", "")
    logger.info(f"🎯 Classifying intent for: '{query[:80]}...'")
    
    response = fast_complete(
        messages=[{"role": "user", "content": f"Classify this query: {query}"}],
        system_prompt=INTENT_SYSTEM_PROMPT,
        temperature=0.1,
        max_tokens=20
    )
    
    intent = response.strip().lower().replace('"', '').replace("'", "")
    logger.debug(f"Raw intent response: '{intent}'")
    
    # Normalize intent
    if intent not in ["analysis", "visualization", "data_management", "meta"]:
        if any(word in intent for word in ["analy", "metric", "rate", "compare", "trend"]):
            intent = "analysis"
        elif any(word in intent for word in ["plot", "chart", "visual", "graph"]):
            intent = "visualization"
        elif any(word in intent for word in ["upload", "dataset", "file", "list"]):
            intent = "data_management"
        else:
            intent = "meta"
    
    logger.info(f"📌 Intent classified as: {intent}")
    return {**state, "intent": intent}


# ─── Data Selection ──────────────────────────────────────────────────────────

def select_data(state: Dict[str, Any]) -> Dict[str, Any]:
    """Select relevant datasets and columns for the query."""
    query = state.get("user_query", "")
    registry = get_registry()
    
    # Get all available datasets
    datasets = registry.list_datasets()
    logger.debug(f"Available datasets: {len(datasets)}")
    
    if not datasets:
        logger.warning("No datasets available")
        return {**state, "error": "No datasets available. Please upload data first."}
    
    # Try semantic search to find relevant datasets/columns
    try:
        retrieval = get_retrieval()
        relevant = retrieval.find_datasets_for_query(query)
        
        if relevant:
            dataset_ids = [r["dataset_id"] for r in relevant[:3]]
            logger.info(f"📊 Selected {len(dataset_ids)} datasets via semantic search")
        else:
            # Fall back to using all datasets
            dataset_ids = [ds["id"] for ds in datasets[:3]]
            logger.info(f"📊 Using first {len(dataset_ids)} datasets (semantic search returned none)")
    except Exception as e:
        # If semantic search fails, use all datasets
        dataset_ids = [ds["id"] for ds in datasets[:3]]
        logger.warning(f"Semantic search failed ({e}), using first {len(dataset_ids)} datasets")
    
    return {**state, "datasets_in_scope": dataset_ids}


# ─── Planning ────────────────────────────────────────────────────────────────

PLANNER_SYSTEM_PROMPT = """You are a data analysis planner. Given a user query and available datasets,
create a step-by-step analysis plan.

Output a JSON array of steps, each with:
- "action": The type of action (load_data, compute, aggregate, filter, join, plot, compare)
- "description": What this step does
- "datasets": Which datasets to use (by name)
- "columns": Which columns to use (if known)

Example output:
[
  {"action": "load_data", "description": "Load channel summary data", "datasets": ["channel_summary"]},
  {"action": "compute", "description": "Calculate publish rate per channel", "datasets": ["channel_summary"], "columns": ["Published Count", "Created Count"]},
  {"action": "plot", "description": "Create bar chart of publish rates", "datasets": ["channel_summary"]}
]

Keep plans concise (3-5 steps). Output ONLY the JSON array."""


def plan_analysis(state: Dict[str, Any]) -> Dict[str, Any]:
    """Create an analysis plan based on intent and available data."""
    query = state.get("user_query", "")
    dataset_ids = state.get("datasets_in_scope", [])
    
    registry = get_registry()
    
    # Build dataset context
    dataset_info = []
    for ds_id in dataset_ids:
        ds = registry.get_dataset(ds_id)
        if ds:
            cols = [c["name"] for c in ds.get("columns", [])]
            dataset_info.append(f"- {ds['name']}: columns = {cols[:15]}")
    
    prompt = f"""Query: {query}

Available datasets:
{chr(10).join(dataset_info)}

Create an analysis plan:"""
    
    try:
        response = think_complete(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=PLANNER_SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=800
        )
        
        # Parse JSON plan
        import json
        # Extract JSON from response
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```")[1]
            if response.startswith("json"):
                response = response[4:]
        
        plan = json.loads(response)
        
    except Exception as e:
        # Default plan if parsing fails
        plan = [
            {"action": "analyze", "description": f"Analyze data to answer: {query}", "datasets": dataset_ids}
        ]
    
    return {**state, "plan": plan}


# ─── Execution ───────────────────────────────────────────────────────────────

def execute_analysis_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the analysis using the code agent."""
    query = state.get("user_query", "")
    dataset_ids = state.get("datasets_in_scope", [])
    intent = state.get("intent", "analysis")
    
    logger.info(f"⚙️ Executing analysis (intent: {intent}, datasets: {dataset_ids})")
    
    # Build task description from plan
    plan = state.get("plan", [])
    if plan:
        task = f"Task: {query}\n\nPlan:\n"
        for i, step in enumerate(plan, 1):
            task += f"{i}. {step.get('description', step.get('action', 'step'))}\n"
        logger.debug(f"Task with plan: {task[:200]}...")
    else:
        task = query
    
    # Add visualization hint for chart generation
    if intent == "visualization" or any(word in query.lower() for word in ['plot', 'chart', 'graph', 'visualize', 'show me']):
        task += """

IMPORTANT - VISUALIZATION REQUIRED:
Create chart_data dict for frontend rendering in Recharts format:
chart_data = {
    "type": "bar",  # or "line", "pie", "area"
    "title": "Your Chart Title",
    "data": [
        {"name": "Category1", "value": 123},
        {"name": "Category2", "value": 456}
    ]
}

For multiple series:
chart_data = {
    "type": "bar",
    "title": "Title",
    "labels": ["A", "B", "C"],
    "datasets": [
        {"name": "Series1", "values": [10, 20, 30]},
        {"name": "Series2", "values": [15, 25, 35]}
    ]
}
"""
    
    # Execute
    result = execute_analysis(task, dataset_ids)
    
    # Build artifacts list
    artifacts = []
    
    # Add tables
    for table in result.tables:
        artifacts.append({"type": "table", **table})
    
    # Add chart_data as chart artifacts (for Recharts rendering)
    exec_result = result.to_dict()
    if "chart_data" in exec_result and exec_result["chart_data"]:
        for i, cd in enumerate(exec_result["chart_data"]):
            artifacts.append({
                "type": "chart",
                "name": cd.get("title", f"chart_{i}"),
                "data": cd
            })
            logger.info(f"📊 Added chart artifact: {cd.get('title', f'chart_{i}')}")
    
    # Add figures (base64 images as fallback)
    for figure in result.figures:
        artifacts.append({"type": "figure", **figure})
    
    logger.info(f"📦 Execution complete: success={result.success}, {len(artifacts)} artifacts")
    if result.error:
        logger.warning(f"Execution error: {result.error[:100]}")
    
    return {
        **state,
        "code": result.code,
        "execution_result": exec_result,
        "artifacts": artifacts,
        "error": result.error if not result.success else None
    }


# ─── Narration ───────────────────────────────────────────────────────────────

def narrate_results_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Generate natural language insights from analysis results."""
    logger.info("📝 Generating narrative response...")
    query = state.get("user_query", "")
    execution_result = state.get("execution_result", {})
    error = state.get("error")
    messages = state.get("messages", [])
    
    # Get schema context
    registry = get_registry()
    context = registry.get_schema_summary()
    
    if error:
        logger.warning(f"Narrating error: {error[:100]}")
        response = narrate_error(
            query,
            error,
            execution_result.get("reflections", [])
        )
        suggestions = []
    else:
        response = narrate_results(
            query,
            execution_result,
            context=context,
            conversation_history=messages[-6:]
        )
        logger.info(f"✅ Narrative generated: {len(response)} chars")
        
        # Generate follow-up suggestions
        try:
            suggestions = generate_follow_up_suggestions(
                query,
                response,
                context[:500]  # Truncate for token limits
            )
            logger.debug(f"Generated {len(suggestions)} follow-up suggestions")
        except Exception as e:
            logger.warning(f"Failed to generate suggestions: {e}")
            suggestions = []
    
    # Add assistant message to history
    new_messages = messages + [{"role": "assistant", "content": response}]
    
    return {
        **state,
        "response": response,
        "suggestions": suggestions,
        "messages": new_messages
    }


# ─── Meta Query Handler ──────────────────────────────────────────────────────

def handle_meta_query(state: Dict[str, Any]) -> Dict[str, Any]:
    """Handle meta queries about system capabilities or data management."""
    query = state.get("user_query", "").lower()
    intent = state.get("intent", "")
    
    registry = get_registry()
    
    # Handle dataset listing
    if any(word in query for word in ["dataset", "available", "list", "what data"]):
        datasets = registry.list_datasets()
        if datasets:
            response = "**Available Datasets:**\n\n"
            for ds in datasets:
                response += f"- **{ds['name']}**: {ds['row_count']} rows, {ds['col_count']} columns\n"
                response += f"  _{ds['description']}_\n\n"
        else:
            response = "No datasets are currently loaded. You can upload CSV or JSON files to get started."
        
        return {**state, "response": response}
    
    # Handle capability questions
    if any(word in query for word in ["help", "what can", "how do", "capable"]):
        response = """**I'm your AI Data Analyst!** Here's what I can do:

📊 **Analysis**: Answer questions about your data, compute metrics, find trends
📈 **Visualization**: Create charts and plots (bar, line, scatter, heatmaps, etc.)
📁 **Data Management**: Browse datasets, view schemas, upload new files
🔍 **Exploration**: Search across columns, compare segments, detect anomalies

**Try asking:**
- "What is the overall publish rate?"
- "Plot monthly trends"
- "Compare top 5 channels by volume"
- "What datasets are available?"
"""
        return {**state, "response": response}
    
    # Handle metrics/KPI queries
    if any(word in query for word in ["kpi", "metric", "overview"]):
        metrics = registry.get_metrics()
        if metrics:
            response = "**Key Metrics:**\n\n"
            for m in metrics:
                response += f"- **{m['name']}**: {m.get('formatted', m.get('value', 'N/A'))}\n"
        else:
            response = "No pre-computed metrics available. Ask me to analyze the data to compute specific metrics."
        
        return {**state, "response": response}
    
    # Default response
    response = f"I received your query: '{state.get('user_query', '')}'\n\nCould you please be more specific about what you'd like to know or do with the data?"
    
    return {**state, "response": response}
