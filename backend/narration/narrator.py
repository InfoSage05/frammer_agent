"""
Insight Narration Agent - Converts analysis outputs to business insights.
Uses the thinking model for high-quality, contextualized explanations.
"""
from typing import Dict, List, Any, Optional
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from llm import think_complete


NARRATOR_SYSTEM_PROMPT = """You are a senior data analyst presenting insights to business stakeholders.

Your role is to:
1. Explain analysis results in clear, non-technical language
2. Highlight key findings, anomalies, and trends
3. Provide business context and implications
4. Suggest actionable next steps or follow-up questions

STYLE GUIDELINES:
- Be concise but comprehensive
- Use bullet points for multiple findings
- Quantify insights with specific numbers when available
- Avoid technical jargon (e.g., say "publish rate" not "conversion ratio of stage_flag=True")
- Frame findings in terms of business impact
- If data shows problems, be direct but constructive

IMPORTANT: Only reference information actually present in the data provided. 
Do not make assumptions about domain-specific terms unless they're defined in the context."""


def narrate_results(
    user_query: str,
    execution_result: Dict[str, Any],
    context: Optional[str] = None,
    conversation_history: Optional[List[Dict]] = None
) -> str:
    """
    Generate a business-contextualized narrative from analysis results.
    
    Args:
        user_query: The original user question
        execution_result: Output from code execution (tables, figures, logs)
        context: Additional context about the data domain
        conversation_history: Previous messages for continuity
    
    Returns:
        Natural language insight narrative
    """
    # Build the prompt
    prompt_parts = [f"USER QUESTION: {user_query}\n"]
    
    # Add context if provided
    if context:
        prompt_parts.append(f"DOMAIN CONTEXT:\n{context}\n")
    
    # Add execution logs (often contain printed metrics)
    if execution_result.get("logs"):
        logs = "\n".join(execution_result["logs"])
        prompt_parts.append(f"ANALYSIS OUTPUT:\n{logs}\n")
    
    # Add table summaries
    if execution_result.get("tables"):
        prompt_parts.append("DATA TABLES GENERATED:")
        for table in execution_result["tables"]:
            prompt_parts.append(f"\nTable: {table.get('name', 'unnamed')}")
            prompt_parts.append(f"Shape: {table.get('shape', 'unknown')}")
            prompt_parts.append(f"Columns: {table.get('columns', [])}")
            if table.get("data"):
                # Show first few rows
                sample = table["data"][:5]
                prompt_parts.append(f"Sample data: {sample}")
    
    # Add figure descriptions
    if execution_result.get("figures"):
        prompt_parts.append(f"\nVISUALIZATIONS CREATED: {len(execution_result['figures'])} chart(s)")
        for fig in execution_result["figures"]:
            prompt_parts.append(f"- {fig.get('name', 'chart')} ({fig.get('type', 'unknown')} type)")
    
    # Add any reflections from retry attempts
    if execution_result.get("reflections"):
        prompt_parts.append(f"\nANALYSIS NOTES: {' '.join(execution_result['reflections'])}")
    
    prompt_parts.append("\nProvide a clear, insightful summary of these findings for the user:")
    
    prompt = "\n".join(prompt_parts)
    
    # Build message history
    messages = []
    if conversation_history:
        messages.extend(conversation_history[-6:])  # Last 3 exchanges
    messages.append({"role": "user", "content": prompt})
    
    return think_complete(
        messages=messages,
        system_prompt=NARRATOR_SYSTEM_PROMPT,
        temperature=0.6,
        max_tokens=1500
    )


def narrate_error(
    user_query: str,
    error: str,
    reflections: List[str]
) -> str:
    """
    Generate a user-friendly explanation when analysis fails.
    
    Args:
        user_query: The original user question
        error: The error that occurred
        reflections: Reflections from retry attempts
    
    Returns:
        Apologetic but helpful response
    """
    prompt = f"""The user asked: "{user_query}"

Unfortunately, the analysis encountered an error: {error}

Reflections from attempts:
{chr(10).join(reflections) if reflections else 'None'}

Provide a helpful response that:
1. Apologizes for the issue
2. Explains what likely went wrong (in simple terms)
3. Suggests how they could rephrase or what alternative they could try"""
    
    return think_complete(
        messages=[{"role": "user", "content": prompt}],
        system_prompt="You are a helpful assistant explaining technical issues to users.",
        temperature=0.7,
        max_tokens=500
    )


def generate_follow_up_suggestions(
    user_query: str,
    analysis_summary: str,
    available_data: str
) -> List[str]:
    """
    Generate suggested follow-up questions based on the analysis.
    
    Args:
        user_query: What the user asked
        analysis_summary: The narrative we provided
        available_data: Description of available datasets
    
    Returns:
        List of 2-4 follow-up question suggestions
    """
    prompt = f"""Based on this analysis conversation:

User asked: {user_query}
Analysis found: {analysis_summary}
Available data includes: {available_data}

Suggest 3 natural follow-up questions the user might want to ask.
Make them specific and actionable, not generic.
Return each question on a new line, starting with "- "."""
    
    response = think_complete(
        messages=[{"role": "user", "content": prompt}],
        system_prompt="You are a data analyst suggesting relevant follow-up analyses.",
        temperature=0.7,
        max_tokens=300
    )
    
    # Parse suggestions
    suggestions = []
    for line in response.strip().split("\n"):
        line = line.strip()
        if line.startswith("- "):
            suggestions.append(line[2:])
        elif line.startswith("* "):
            suggestions.append(line[2:])
        elif line and len(suggestions) < 4:
            suggestions.append(line)
    
    return suggestions[:4]


def summarize_kpis(metrics: List[Dict[str, Any]]) -> str:
    """
    Generate a natural language summary of KPI metrics.
    
    Args:
        metrics: List of metric dictionaries with name, value, formatted_value
    
    Returns:
        Prose summary of key metrics
    """
    if not metrics:
        return "No metrics available."
    
    metrics_text = "\n".join([
        f"- {m['name']}: {m.get('formatted', m.get('value', 'N/A'))}"
        for m in metrics
    ])
    
    prompt = f"""These are the key performance metrics:

{metrics_text}

Write a 2-3 sentence executive summary highlighting the most important points.
Focus on what these numbers mean for the business."""
    
    return think_complete(
        messages=[{"role": "user", "content": prompt}],
        system_prompt="You are a business analyst writing executive summaries.",
        temperature=0.5,
        max_tokens=300
    )
