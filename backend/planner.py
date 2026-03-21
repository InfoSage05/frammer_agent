"""
Planning Agent with Conditional Phases

Phase Architecture (activated based on task type):
① Task Understanding     - ALWAYS: Classify query type, extract intent
② Data Planning          - If task needs data: Identify datasets/columns needed
③ Data Acquisition       - If Data Planning ran: Use DBMS preset functions
④ Approach Planning      - For complex tasks: Plan multi-step analysis
⑤ Code Generation        - ALWAYS when analysis needed
⑥ Error Diagnosis        - If execution failed: Reflexion loop in executor
"""
import json
import re
import sys
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

# Setup paths
_backend_dir = Path(__file__).parent
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_backend_dir.parent))

from llm.groq_client import think_complete, fast_complete
from dbms import list_datasets, get_schema, get_first_rows, get_datasets_context

# Setup logger
logger = logging.getLogger("planner")


class TaskType(Enum):
    """Types of user tasks"""
    GREETING = "greeting"
    LIST_DATA = "list_data"
    DESCRIBE_DATA = "describe_data"
    SIMPLE_QUERY = "simple_query"
    ANALYSIS = "analysis"
    VISUALIZATION = "visualization"
    COMPLEX = "complex"


@dataclass
class TaskPlan:
    """Result of task understanding phase"""
    task_type: TaskType
    needs_data: bool
    needs_code: bool
    datasets_needed: List[str]
    columns_needed: Dict[str, List[str]]
    approach: str


# Patterns for quick classification
GREETING_PATTERNS = ["hello", "hi", "hey", "help", "what can you do", "who are you"]
LIST_PATTERNS = ["what datasets", "list datasets", "show datasets", "available data", "what data"]
DESCRIBE_PATTERNS = ["describe", "schema", "columns in", "what columns", "show columns"]

VISUALIZE_TRIGGERS = ["chart", "plot", "graph", "visualize", "show me"]


def classify_task(query: str) -> TaskType:
    """Quick classification of task type"""
    q = query.lower().strip()
    
    if any(p in q for p in GREETING_PATTERNS) and len(q) < 50:
        return TaskType.GREETING
    if any(p in q for p in LIST_PATTERNS):
        return TaskType.LIST_DATA
    if any(p in q for p in DESCRIBE_PATTERNS):
        return TaskType.DESCRIBE_DATA
    if any(word in q for word in ["chart", "plot", "graph", "visualize", "show me"]):
        return TaskType.VISUALIZATION
    if any(word in q for word in ["total", "count", "sum", "average", "how many"]):
        return TaskType.ANALYSIS
    if any(word in q for word in ["compare", "trend", "forecast", "correlation", "by"]):
        return TaskType.COMPLEX
    
    return TaskType.SIMPLE_QUERY


def is_visualization_request(query: str) -> bool:
    q = query.lower()
    return any(t in q for t in VISUALIZE_TRIGGERS)


def handle_greeting(query: str) -> dict:
    """Handle greeting/help queries directly"""
    logger.info("━━━ GREETING HANDLER ━━━")
    datasets = list_datasets()
    dataset_names = [d["name"] for d in datasets]
    
    prompt = f"""You are a data analysis assistant for Frammer AI (media publishing platform).

User: "{query}"

Respond briefly and naturally. Mention you can help analyze their video publishing data.
Available datasets: {', '.join(dataset_names[:5])}

Keep under 80 words."""

    logger.debug(f"Generating greeting response...")
    response = fast_complete([{"role": "user", "content": prompt}], temperature=0.7)
    logger.info(f"Response: {response[:100]}...")
    return {"answer": response.strip(), "artifacts": [], "reasoning": []}


def handle_list_data(query: str) -> dict:
    """Handle dataset listing queries"""
    logger.info("━━━ LIST DATA HANDLER ━━━")
    datasets = list_datasets()
    logger.info(f"Found {len(datasets)} datasets")
    
    answer = "Here are the available datasets:\n\n"
    for ds in datasets:
        answer += f"• **{ds['name']}** - {ds['row_count']} rows, {ds['col_count']} columns\n"
        answer += f"  Columns: {', '.join(ds['columns'][:6])}{'...' if len(ds['columns']) > 6 else ''}\n\n"
    
    return {"answer": answer, "artifacts": [], "reasoning": []}


def handle_describe_data(query: str) -> dict:
    """Handle dataset description queries"""
    logger.info("━━━ DESCRIBE DATA HANDLER ━━━")
    datasets = list_datasets()
    dataset_names = [d["name"] for d in datasets]
    
    # Find which dataset user is asking about
    q_lower = query.lower()
    target_dataset = None
    for name in dataset_names:
        if name.lower() in q_lower:
            target_dataset = name
            break
    
    if not target_dataset:
        logger.info("No specific dataset mentioned, asking user")
        return {
            "answer": f"Which dataset would you like to know about? Available: {', '.join(dataset_names[:8])}",
            "artifacts": [],
            "reasoning": []
        }
    
    logger.info(f"Describing dataset: {target_dataset}")
    
    # Get schema
    try:
        schema = get_schema(target_dataset)
        first_rows = get_first_rows(target_dataset, 3)
        
        answer = f"**Dataset: {target_dataset}**\n\n"
        answer += "| Column | Type | Null% | Sample Values |\n"
        answer += "|--------|------|-------|---------------|\n"
        for col in schema:
            samples = str(col['sample_values'][:2]) if col['sample_values'] else "[]"
            answer += f"| {col['col_name']} | {col['dtype']} | {col['null_pct']}% | {samples[:30]} |\n"
        
        answer += f"\n**Preview (first 3 rows):**\n```\n{first_rows.to_string(index=False)}\n```"
        
        logger.info(f"Schema has {len(schema)} columns")
        return {"answer": answer, "artifacts": [], "reasoning": []}
    except Exception as e:
        logger.error(f"Error getting schema: {e}")
        return {"answer": f"Error getting schema: {e}", "artifacts": [], "reasoning": []}


def understand_task(query: str, datasets: List[dict], conversation_context: str = "") -> TaskPlan:
    """
    Phase 1: Task Understanding
    Analyze query to determine what's needed, using conversation history for context
    """
    logger.info("━━━ PHASE 1: Task Understanding ━━━")
    dataset_names = [d["name"] for d in datasets]
    dataset_info = "\n".join([f"- {d['name']}: columns = {d['columns']}" for d in datasets])
    
    # Build context section if we have conversation history
    context_section = ""
    if conversation_context:
        context_section = f"""
CONVERSATION HISTORY:
{conversation_context}

Note: The user may be referring to previous analysis, datasets, or findings. 
Use this context to understand what "it", "that", "same", etc. refer to.
"""
    
    prompt = f"""Analyze this data analysis request and extract key information.
{context_section}
USER REQUEST: {query}

AVAILABLE DATASETS (use EXACT names when referencing):
{dataset_info}

IMPORTANT: Dataset names must match EXACTLY (e.g., 'channel_summary' not 'Channel Summary').
If the user mentions "channels" or "channel data", look for datasets with "channel" in the name.
If the user mentions "users" or "user data", look for datasets with "user" in the name.
If the user mentions "monthly" or "trends", look for the "monthly" dataset.

Respond with JSON only:
{{
    "intent": "brief description of what user wants (resolve any pronouns using context)",
    "datasets_needed": ["exact_dataset_name"],
    "columns_likely_needed": ["col1", "col2"],
    "requires_calculation": true/false,
    "requires_visualization": true/false,
    "complexity": "simple/medium/complex",
    "references_previous": true/false
}}"""

    logger.debug("Calling LLM for task understanding...")
    response = fast_complete([{"role": "user", "content": prompt}], temperature=0.1)
    logger.debug(f"LLM response: {response[:200]}...")
    
    try:
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            data = json.loads(match.group())
            plan = TaskPlan(
                task_type=TaskType.ANALYSIS if data.get("requires_calculation") else TaskType.VISUALIZATION,
                needs_data=True,
                needs_code=data.get("requires_calculation", False) or data.get("requires_visualization", False),
                datasets_needed=data.get("datasets_needed", []),
                columns_needed={},
                approach=data.get("intent", "")
            )
            logger.info(f"Intent: {plan.approach}")
            logger.info(f"Datasets: {plan.datasets_needed}")
            logger.info(f"Needs code: {plan.needs_code}")
            if data.get("references_previous"):
                logger.info("References previous conversation")
            return plan
    except Exception as e:
        logger.warning(f"Failed to parse LLM response: {str(e)[:50]}")
    
    logger.info("Using default task plan")
    return TaskPlan(
        task_type=TaskType.ANALYSIS,
        needs_data=True,
        needs_code=True,
        datasets_needed=dataset_names[:1],
        columns_needed={},
        approach=query
    )


def generate_approach_plan(query: str, task_plan: TaskPlan, datasets: List[dict], conversation_context: str = "") -> str:
    """
    Phase 4: Approach Planning
    Use thinking model to deeply reason about the analysis approach.
    Can explore dataset schemas to inform the plan.
    """
    logger.info("━━━ PHASE 4: Approach Planning (Thinking) ━━━")
    
    # Build comprehensive dataset context
    dataset_overview = ""
    for ds in datasets:
        dataset_overview += f"\n• '{ds['name']}' ({ds['row_count']} rows, {ds['col_count']} cols)"
    
    # Get detailed schema for relevant datasets
    detailed_schemas = build_detailed_schemas(task_plan, datasets)
    
    # Add conversation context section
    context_section = ""
    if conversation_context:
        context_section = f"""
CONVERSATION HISTORY:
{conversation_context}

Important: If the user refers to "it", "that", "same data", etc., use the context above to understand what they mean.
"""
    
    system_prompt = """You are a senior data analyst and visualization expert. Your job is to think deeply about analysis tasks and create clear, actionable plans.

Think step by step:
1. First understand EXACTLY what the user is asking for
2. Identify ALL components of the question (don't miss any part)
3. Figure out which dataset(s) have the required data
4. Plan the data transformations needed (groupby, filter, merge, pivot, etc.)
5. Design the BEST visualization for the data:
   - Choose chart type based on what story the data tells
   - Keep it SIMPLE and readable (not too many data points)
   - Proper axis labels and title
   - For comparisons: grouped/stacked bar charts
   - For trends over time: line charts
   - For parts of whole: pie charts (max 5-7 slices)
   - For rankings: horizontal bar charts

Be thorough but keep visualizations clean and focused."""

    prompt = f"""I need to analyze this question and create a detailed execution plan.
{context_section}
QUESTION: {query}

AVAILABLE DATASETS:{dataset_overview}

DETAILED SCHEMAS:{detailed_schemas}

Think through this carefully:

1. UNDERSTAND THE REQUEST:
   - What exactly is being asked?
   - Are there multiple parts to this question?
   - What would a complete answer look like?

2. DATA IDENTIFICATION:
   - Which dataset(s) contain the data I need?
   - Which columns are relevant?

3. ANALYSIS STEPS:
   - What filtering is needed?
   - What grouping/aggregation?
   - What calculations?

4. VISUALIZATION DESIGN (be specific):
   - What chart type is BEST for this data? Why?
   - What goes on X-axis? (keep it readable - max 5-10 items)
   - What goes on Y-axis?
   - For multi-series: what are the series/legend items?
   - How to structure the data for the chart?
   
   Example for "top 5 users by count with channel breakdown":
   - Chart type: Grouped bar chart
   - X-axis: User names (5 users)
   - Y-axis: Video count
   - Series/Legend: Each channel as a separate bar group
   - Data structure: [{{'User': 'X', 'Channel A': 10, 'Channel B': 5}}, ...]

5. SUMMARY: What key insight should be highlighted?

Provide a clear, numbered EXECUTION PLAN:"""

    logger.info("Thinking deeply about the approach...")
    response = think_complete(
        [{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.3,
        max_tokens=1500
    )
    plan = response.strip()
    
    # Log the plan (first several lines)
    plan_lines = plan.split('\n')
    logger.info("Approach Plan:")
    for line in plan_lines[:10]:
        if line.strip():
            logger.info(f"  {line.strip()[:80]}")
    if len(plan_lines) > 10:
        logger.info(f"  ... (+{len(plan_lines) - 10} more lines)")
    
    return plan


def build_detailed_schemas(task_plan: TaskPlan, datasets: List[dict]) -> str:
    """Build detailed schema text for relevant datasets."""
    detailed_schemas = ""
    relevant_datasets = task_plan.datasets_needed if task_plan.datasets_needed else [d["name"] for d in datasets[:5]]

    for ds_name in relevant_datasets:
        try:
            schema = get_schema(ds_name)
            detailed_schemas += f"\n\n### '{ds_name}' Schema:\n"
            for col in schema:
                detailed_schemas += f"  - {col['col_name']} ({col['dtype']})"
                if col['sample_values']:
                    samples = str(col['sample_values'][:3])[:50]
                    detailed_schemas += f" | samples: {samples}"
                detailed_schemas += "\n"

            # Get first few rows preview
            first_rows = get_first_rows(ds_name, 3)
            if not first_rows.empty:
                detailed_schemas += "  Preview (first 3 rows):\n"
                for _, row in first_rows.head(3).iterrows():
                    row_preview = {k: str(v)[:20] for k, v in row.items()}
                    detailed_schemas += f"    {row_preview}\n"
        except Exception as e:
            logger.debug(f"Could not get schema for {ds_name}: {e}")

    return detailed_schemas


def generate_visualization_plan(
    query: str,
    task_plan: TaskPlan,
    datasets: List[dict],
    conversation_context: str = "",
    detailed_schemas: str = "",
) -> str:
    """Phase 4b: Visualization design via visualization agent."""
    if task_plan.task_type not in [TaskType.VISUALIZATION, TaskType.COMPLEX, TaskType.ANALYSIS]:
        return ""

    try:
        from visualization_agent import design_visualization
        return design_visualization(
            query=query,
            datasets=datasets,
            conversation_context=conversation_context,
            detailed_schemas=detailed_schemas,
        )
    except Exception as e:
        logger.debug(f"Visualization agent unavailable: {e}")
        return ""


def generate_code(
    query: str,
    task_plan: TaskPlan,
    datasets: List[dict],
    approach_plan: str = "",
    visualization_plan: str = "",
) -> str:
    """
    Phase 5: Code Generation
    Generate Python code based on task plan and approach
    """
    logger.info("━━━ PHASE 5: Code Generation ━━━")
    
    # Build rich context with actual schema
    # Always include needed datasets + a brief listing of others so the LLM knows what's available
    schema_context = ""
    needed = set(task_plan.datasets_needed) if task_plan.datasets_needed else set()
    include_all = len(datasets) <= 12  # If few datasets, show all schemas

    for ds in datasets:
        is_needed = ds["name"] in needed or include_all
        if is_needed:
            try:
                schema = get_schema(ds["name"])
                schema_context += f"\n\n### Dataset: '{ds['name']}' ({ds['row_count']} rows)\n"
                schema_context += "Columns:\n"
                for col in schema:
                    schema_context += f"  - `{col['col_name']}` ({col['dtype']})"
                    if col['sample_values']:
                        schema_context += f" -- samples: {col['sample_values'][:3]}"
                    schema_context += "\n"
            except:
                schema_context += f"\n\n### Dataset: '{ds['name']}'\nColumns: {ds['columns']}\n"
        else:
            # Brief listing so LLM knows it exists
            schema_context += f"\n\n### Dataset: '{ds['name']}' ({ds['row_count']} rows) — columns: {', '.join(ds['columns'][:6])}\n"
    
    # Include the approach plan in the prompt
    plan_section = ""
    if approach_plan:
        plan_section = f"""
ANALYSIS PLAN (follow this exactly):
{approach_plan}
"""

    viz_section = ""
    if visualization_plan:
        viz_section = f"""
VISUALIZATION PLAN (follow this exactly):
{visualization_plan}
"""
    
    prompt = f"""Generate Python code to answer this data analysis question.

QUESTION: {query}
{plan_section}
{viz_section}
AVAILABLE DATA:{schema_context}

CRITICAL RULES:
1. DO NOT redefine get_full_dataset, create_chart, or RESULT - they already exist!
2. Load data: df = get_full_dataset('exact-dataset-name') — name must match EXACTLY
3. Use EXACT column names from the schema above (case-sensitive, including spaces!)
4. Convert numpy to Python: int(value), float(value) — ALWAYS convert before putting in charts
5. For charts use create_chart(type, title, data_list, x_key, y_keys):
   - type: 'bar', 'line', 'area', 'pie'
   - data_list: list of dicts, each dict is one data point
   - x_key: the key used for X-axis labels
   - y_keys: list of keys for Y-axis values (multiple = grouped/stacked bars)
6. Set RESULT['summary'] = "your text" at the end — ALWAYS set a summary
7. DO NOT create a new RESULT dict
8. Duration columns are strings like "HH:MM:SS" — convert to minutes/hours for numeric analysis
9. When filtering top/bottom N, use .head(N) or .tail(N) after sorting
10. IMPORTANT: After groupby().agg(), use .reset_index() before accessing the grouped column
11. AVOID pivot() — instead use groupby + create dicts manually for chart data
12. When creating grouped bar charts, build data like: [{{'User': name, 'Ch1': val1, 'Ch2': val2}}]

CHART DATA STRUCTURE EXAMPLES:

Simple bar (one series):
data = [{{'User': 'Alice', 'Count': 100}}, {{'User': 'Bob', 'Count': 80}}]
create_chart('bar', 'Users by Count', data, 'User', ['Count'])

Grouped bar (multiple series - e.g., breakdown by channel):
data = [
    {{'User': 'Alice', 'Facebook': 50, 'Instagram': 30, 'YouTube': 20}},
    {{'User': 'Bob', 'Facebook': 40, 'Instagram': 25, 'YouTube': 15}}
]
create_chart('bar', 'Users with Channel Breakdown', data, 'User', ['Facebook', 'Instagram', 'YouTube'])

FOLLOW THE PLAN - structure data exactly as specified in the visualization design.

OUTPUT ONLY THE CODE BODY (no imports, no function defs, no markdown):"""

    logger.debug("Calling LLM for code generation...")
    response = think_complete([{"role": "user", "content": prompt}], temperature=0.2)
    
    # Clean the code
    code = response.strip()
    
    # Remove markdown fences
    if "```" in code:
        match = re.search(r'```(?:python)?\s*\n?(.*?)```', code, re.DOTALL | re.IGNORECASE)
        if match:
            code = match.group(1).strip()
        else:
            code = code.replace("```python", "").replace("```", "").strip()
    
    logger.info(f"Generated {len(code)} chars of code")
    # Log first few lines of code
    code_preview = '\n'.join(code.split('\n')[:5])
    logger.debug(f"Code preview:\n{code_preview}")
    
    return code


def run_planner(query: str, conversation_context: str = "") -> dict:
    """
    Main entry point - runs planning phases based on task type
    
    Args:
        query: User's question
        conversation_context: Previous conversation history for context
    
    Returns: {answer: str, artifacts: list, reasoning: list, datasets_used: list}
    """
    logger.info("=" * 60)
    logger.info(f"PLANNER START: {query[:80]}{'...' if len(query) > 80 else ''}")
    logger.info("=" * 60)
    
    if conversation_context:
        logger.info(f"Conversation context: {len(conversation_context)} chars")
    
    # Quick classification
    task_type = classify_task(query)
    logger.info(f"Task Classification: {task_type.value}")
    
    # Handle simple cases directly (no LLM needed)
    if task_type == TaskType.GREETING:
        return handle_greeting(query)
    
    if task_type == TaskType.LIST_DATA:
        return handle_list_data(query)
    
    if task_type == TaskType.DESCRIBE_DATA:
        return handle_describe_data(query)

    # Recommendation requests
    try:
        from recommendation_agent import should_run as should_run_recs, answer_recommendations
        if should_run_recs(query, conversation_context=conversation_context):
            return answer_recommendations(query, conversation_context=conversation_context)
    except Exception as e:
        logger.debug(f"Recommendation agent unavailable: {e}")

    # Short-circuit KPI queries (skip when explicit visualization requested)
    try:
        from kpi_agent import classify_kpi, answer_kpi_query
        kpi_decision = classify_kpi(query, conversation_context=conversation_context)
        if (
            not is_visualization_request(query)
            and kpi_decision.get("match")
            and float(kpi_decision.get("confidence", 0.0)) >= 0.6
        ):
            return answer_kpi_query(query, conversation_context=conversation_context)
    except Exception as e:
        logger.debug(f"KPI agent unavailable: {e}")
    
    # For analysis/visualization tasks, use full pipeline
    datasets = list_datasets()
    logger.info(f"Available datasets: {len(datasets)}")
    
    # Phase 1: Task Understanding (with conversation context)
    task_plan = understand_task(query, datasets, conversation_context)
    
    # Phase 4: Approach Planning (for complex tasks or when conversation context exists)
    approach_plan = ""
    visualization_plan = ""
    needs_approach = (
        task_plan.task_type in [TaskType.COMPLEX, TaskType.ANALYSIS, TaskType.VISUALIZATION] 
        or len(query.split()) > 10
        or bool(conversation_context)  # Always plan when there's conversation history
    )
    if needs_approach:
        approach_plan = generate_approach_plan(query, task_plan, datasets, conversation_context)

    # Phase 4b: Visualization Design (separate agent)
    detailed_schemas = build_detailed_schemas(task_plan, datasets)
    visualization_plan = generate_visualization_plan(
        query,
        task_plan,
        datasets,
        conversation_context=conversation_context,
        detailed_schemas=detailed_schemas,
    )
    
    # Phase 5: Code Generation (with approach plan)
    code = generate_code(query, task_plan, datasets, approach_plan, visualization_plan)
    
    # Phase 6: Code Execution with Reflexion
    logger.info("━━━ PHASE 6: Code Execution ━━━")
    from code_agent.executor import execute_code_with_retry
    
    result = execute_code_with_retry(code, description=query, max_retries=3)
    
    # Build response
    artifacts = []
    answer = ""
    datasets_used = task_plan.datasets_needed or []
    
    if result["success"]:
        logger.info("Execution successful")
        inner = result.get("result", {})
        if isinstance(inner, dict):
            # Extract charts
            if inner.get("charts"):
                artifacts.extend(inner["charts"])
                logger.info(f"  Charts: {len(inner['charts'])}")
            if inner.get("tables"):
                artifacts.extend(inner["tables"])
                logger.info(f"  Tables: {len(inner['tables'])}")
            # Use summary as answer
            answer = inner.get("summary", "Analysis complete.")
            if inner.get("data"):
                answer += f"\n\nData: {json.dumps(inner['data'], default=str)}"
        else:
            answer = str(inner) if inner else "Analysis complete."
    else:
        error_preview = result.get('error', 'Unknown error')[:150]
        logger.error(f"✗ Execution failed: {error_preview}")
        answer = f"I encountered an error during analysis: {error_preview}"
        if result.get("reflections"):
            logger.info(f"Reflections: {len(result['reflections'])}")
            answer += f"\n\nI tried to fix it: {result['reflections'][-1][:100]}"
    
    logger.info("=" * 60)
    logger.info(f"PLANNER END - Answer: {answer[:100]}...")
    logger.info("=" * 60)
    
    return {
        "answer": answer,
        "artifacts": artifacts,
        "datasets_used": datasets_used,
        "reasoning": [
            {"phase": "task_understanding", "result": task_plan.approach},
            {"phase": "code_generation", "code_length": len(code)},
            {"phase": "execution", "success": result["success"]}
        ]
    }
