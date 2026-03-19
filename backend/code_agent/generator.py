"""
Code Generator - LLM-based Python code generation for data analysis.
Uses the fast model for quick code generation.
"""
from typing import Dict, List, Optional, Any
from pathlib import Path

import sys
_backend_dir = Path(__file__).parent.parent
_root_dir = _backend_dir.parent
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_root_dir))

from llm.groq_client import fast_complete
from context_manager.registry import get_registry


import re
import logging

# Set up logging
logger = logging.getLogger("frammer.code_agent")

CODE_GEN_SYSTEM_PROMPT = """You are an expert Python data analyst. Generate clean, executable Python code.

CRITICAL OUTPUT RULES:
1. Return ONLY pure Python code - NO markdown, NO ```, NO explanations
2. Start DIRECTLY with import statements or code
3. NEVER use ``` anywhere in your response

VARIABLES AVAILABLE (pre-loaded):
- df = main dataset (pandas DataFrame, already loaded)
- df_1, df_2, etc. = additional datasets if needed

RESULT STORAGE (REQUIRED):
- result_df = for DataFrame outputs (will be captured)
- result_value = for single numeric results
- chart_data = for charts (Recharts-compatible JSON format)

CHART DATA FORMAT (for frontend rendering):
When creating visualizations, instead of matplotlib, create chart_data dict:
```
chart_data = {
    "type": "bar",  # or "line", "pie", "area"
    "title": "My Chart Title",
    "labels": ["A", "B", "C"],
    "datasets": [
        {"name": "Series1", "values": [10, 20, 30]},
        {"name": "Series2", "values": [15, 25, 35]}
    ]
}
```

For simple cases, use list of dicts:
```
chart_data = {"type": "bar", "title": "Title", "data": [{"name": "A", "value": 10}, {"name": "B", "value": 20}]}
```

DATA HANDLING:
- Use EXACT column names (case-sensitive) from the schema
- Handle NaN: .fillna(0) or .dropna()
- Convert strings: pd.to_numeric(col, errors='coerce')
- Print key metrics with print() for logging

IMPORTANT: Start your response with Python code immediately. No preamble text."""


def _clean_code(code: str) -> str:
    """
    Robustly clean LLM output to extract pure Python code.
    Handles various markdown formats and edge cases.
    """
    if not code:
        return ""
    
    original = code
    code = code.strip()
    
    # Pattern 1: Extract from ```python ... ``` or ```py ... ``` blocks (greedy)
    pattern1 = r'```(?:python|py|Python)?\s*\n?(.*?)```'
    matches = re.findall(pattern1, code, re.DOTALL | re.IGNORECASE)
    if matches:
        # Get the largest code block (in case there are multiple)
        code = max(matches, key=len).strip()
        logger.debug(f"Extracted code from markdown block ({len(code)} chars)")
    
    # Pattern 2: Remove ALL markdown code fences aggressively
    code = re.sub(r'^```\w*\s*', '', code, flags=re.MULTILINE)
    code = re.sub(r'```\s*$', '', code, flags=re.MULTILINE)
    code = re.sub(r'\n```\s*\n', '\n', code)
    code = re.sub(r'```', '', code)  # Remove any remaining
    
    # Pattern 3: Remove stray backticks
    code = re.sub(r'^`+', '', code)
    code = re.sub(r'`+$', '', code)
    code = re.sub(r'^`+', '', code, flags=re.MULTILINE)
    code = re.sub(r'`+$', '', code, flags=re.MULTILINE)
    
    # Pattern 4: Remove "python" or "Python" if it's on its own line at start
    lines = code.strip().split('\n')
    while lines and lines[0].strip().lower() in ['python', 'py', '# python', '']:
        lines = lines[1:]
    code = '\n'.join(lines)
    
    # Pattern 5: Remove explanatory text before actual code
    lines = code.split('\n')
    start_idx = 0
    code_starters = ['import ', 'from ', 'df', 'result_', 'plt.', 'fig', 'chart_', '#', 'print(', 'for ', 'if ', 'try:', 'with ']
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        # Check if line looks like code
        if any(stripped.startswith(s) for s in code_starters):
            start_idx = i
            break
        # Check for assignment or function definition
        if re.match(r'^[a-zA-Z_]\w*\s*=', stripped) or stripped.startswith('def '):
            start_idx = i
            break
    
    if start_idx > 0:
        code = '\n'.join(lines[start_idx:])
        logger.debug(f"Removed {start_idx} lines of preamble")
    
    # Pattern 6: Remove trailing explanatory text
    lines = code.strip().split('\n')
    end_idx = len(lines)
    for i in range(len(lines) - 1, max(0, len(lines) - 5), -1):
        line = lines[i].strip()
        # Keep if it's actual code
        if (line.startswith('#') or 
            line.endswith(')') or 
            line.endswith(':') or 
            line.endswith(']') or
            line.endswith('}') or
            line.endswith(',') or
            '=' in line or
            line == '' or
            line.startswith('print')):
            end_idx = i + 1
            break
    
    code = '\n'.join(lines[:end_idx]).strip()
    
    # Final validation: check for obvious problems
    if '```' in code:
        logger.warning(f"Code still contains backticks after cleaning!")
        code = code.replace('```python', '').replace('```py', '').replace('```', '')
    
    if code != original:
        logger.info(f"Code cleaned: {len(original)} -> {len(code)} chars")
    
    return code


def generate_analysis_code(
    task: str,
    datasets: List[Dict[str, Any]],
    context: Optional[str] = None
) -> str:
    """
    Generate Python code for a data analysis task.
    
    Args:
        task: Natural language description of the analysis
        datasets: List of dataset schemas to use
        context: Additional context (e.g., previous errors, constraints)
    
    Returns:
        Generated Python code string
    """
    # Build dataset context with clear variable names
    dataset_context = []
    for i, ds in enumerate(datasets):
        var_name = "df" if i == 0 else f"df_{i}"
        ds_info = f"Dataset '{ds['name']}' loaded as variable `{var_name}`:\n"
        ds_info += f"  - Shape: ({ds.get('row_count', 'unknown')} rows, {ds.get('col_count', 'unknown')} cols)\n"
        ds_info += f"  - Description: {ds.get('description', 'N/A')}\n"
        ds_info += "  - Columns (use EXACT names with correct case):\n"
        for col in ds.get("columns", [])[:25]:  # Show more columns
            ds_info += f"    * `{col['name']}` ({col.get('dtype', 'unknown')}, {col.get('semantic_type', 'unknown')})"
            if col.get("top_values"):
                ds_info += f" - sample values: {col['top_values'][:3]}"
            ds_info += "\n"
        dataset_context.append(ds_info)
    
    prompt = f"""TASK: {task}

AVAILABLE DATA:
{chr(10).join(dataset_context)}

IMPORTANT:
- Use `df` for the main dataset (already loaded)
- Use EXACT column names from the schema above (they are case-sensitive)
- Store DataFrame results in `result_df`
- Create visualizations with plt.figure() - they are captured automatically
- Do NOT use plt.show()
"""
    
    if context:
        prompt += f"\nADDITIONAL CONTEXT:\n{context}\n"
    
    prompt += "\nGenerate the Python code:"
    
    code = fast_complete(
        messages=[{"role": "user", "content": prompt}],
        system_prompt=CODE_GEN_SYSTEM_PROMPT,
        temperature=0.2,
        max_tokens=2000
    )
    
    return _clean_code(code)


def generate_fix_code(
    original_code: str,
    error_message: str,
    task: str,
    dataset_schema: str = ""
) -> str:
    """
    Generate fixed code based on error feedback (Reflexion pattern).
    
    Args:
        original_code: The code that failed
        error_message: The error message/traceback
        task: Original task description
        dataset_schema: Schema of available datasets
    
    Returns:
        Fixed Python code
    """
    # Truncate error to avoid token overflow
    error_msg = error_message[:1500] if len(error_message) > 1500 else error_message
    
    prompt = f"""The following code failed to execute:

{original_code}

ERROR:
{error_msg}

ORIGINAL TASK: {task}
"""
    
    if dataset_schema:
        prompt += f"""
AVAILABLE DATASETS AND COLUMNS (use EXACT names):
{dataset_schema}
"""
    
    prompt += """
Analyze what went wrong and generate FIXED code. Common fixes:
1. Column name typos - use EXACT column names from the schema above
2. Data type issues - use pd.to_numeric(col, errors='coerce') for string-to-number
3. Missing imports - ensure all needed modules are imported
4. KeyError - check if column exists with 'if col in df.columns'
5. Empty data - add checks like 'if len(df) > 0'
6. Division by zero - use .replace(0, np.nan) or add checks
7. tolist() errors - ensure the object is a list/array before calling tolist()
8. Index out of bounds - check array/list length before accessing

Generate ONLY the corrected Python code (no markdown, no explanations):"""
    
    code = fast_complete(
        messages=[{"role": "user", "content": prompt}],
        system_prompt=CODE_GEN_SYSTEM_PROMPT,
        temperature=0.3,
        max_tokens=2500
    )
    
    return _clean_code(code)


def generate_fix_code_with_thinking(
    original_code: str,
    error_message: str,
    task: str,
    dataset_schema: str = "",
    reflections: List[str] = None
) -> str:
    """
    Generate fixed code using the thinking (larger) LLM for complex issues.
    Used when fast LLM fixes have failed multiple times.
    
    Args:
        original_code: The code that failed
        error_message: The error message/traceback
        task: Original task description
        dataset_schema: Schema of available datasets
        reflections: Previous reflections on failures
    
    Returns:
        Fixed Python code
    """
    from llm.groq_client import think_complete
    
    # Build a detailed prompt with all context
    error_msg = error_message[:2000] if len(error_message) > 2000 else error_message
    
    reflection_text = ""
    if reflections:
        reflection_text = "\nPREVIOUS ATTEMPTS FAILED WITH THESE REFLECTIONS:\n"
        for i, r in enumerate(reflections, 1):
            reflection_text += f"{i}. {r}\n"
    
    prompt = f"""You are an expert Python developer debugging data analysis code.

ORIGINAL TASK: {task}

AVAILABLE DATASETS AND COLUMNS (use EXACT names as shown):
{dataset_schema}

FAILED CODE:
```python
{original_code}
```

ERROR MESSAGE:
{error_msg}
{reflection_text}

ANALYSIS REQUIRED:
1. Identify the root cause of the error
2. Check if column names match exactly (case-sensitive)
3. Verify data types are handled correctly
4. Ensure all imports are present
5. Handle edge cases (empty data, NaN, division by zero)

Generate CORRECT, WORKING Python code that accomplishes the task.
The code must:
- Use exact column names from the schema
- Handle potential NaN/missing values
- Store results in result_df, result_value, or chart_data
- NOT use plt.show()

Output ONLY the corrected Python code, no explanations:"""
    
    code = think_complete(
        messages=[{"role": "user", "content": prompt}],
        system_prompt=CODE_GEN_SYSTEM_PROMPT,
        temperature=0.2,
        max_tokens=3000
    )
    
    return _clean_code(code)


def generate_and_execute_code(
    task_description: str,
    requirements: Dict[str, Any] = None,
    session_id: str = None
) -> Dict[str, Any]:
    """
    Generate and execute Python code for a data analysis task.
    This is the main entry point used by the orchestrator.
    
    Args:
        task_description: Natural language description of what to do
        requirements: Optional dict with dataset_ids, output_type preferences
        session_id: Optional session identifier
    
    Returns:
        Dict with success, data, charts, error keys
    """
    from code_agent.sandbox import execute_analysis
    from context_manager.registry import get_registry
    
    requirements = requirements or {}
    registry = get_registry()
    
    # Get dataset IDs - either specified or use all
    dataset_ids = requirements.get("dataset_ids", [])
    if not dataset_ids:
        # If not specified, get all datasets and pick the most relevant
        all_datasets = registry.list_datasets()
        if all_datasets:
            # Use first dataset by default, or search if query hints at specific data
            dataset_ids = [all_datasets[0]["id"]]
            
            # Try to find relevant datasets based on task description
            search_results = registry.search_columns(task_description, top_k=3)
            if search_results:
                found_ids = list(set(r.get("dataset_id") for r in search_results if r.get("dataset_id")))
                if found_ids:
                    dataset_ids = found_ids[:3]  # Use up to 3 relevant datasets
    
    logger.info(f"Executing code task with datasets: {dataset_ids}")
    logger.info(f"Task: {task_description[:100]}...")
    
    # Execute using sandbox
    result = execute_analysis(task_description, dataset_ids)
    
    # Format response
    response = {
        "success": result.success,
        "data": None,
        "charts": [],
        "error": result.error
    }
    
    # Extract tables
    if result.tables:
        response["data"] = result.tables
    
    # Extract charts/figures
    if result.figures:
        for fig in result.figures:
            if fig.get("type") == "chart":
                response["charts"].append(fig.get("data"))
            elif fig.get("type") == "image":
                response["charts"].append({
                    "type": "image",
                    "data": fig.get("data")
                })
            elif fig.get("type") == "plotly":
                response["charts"].append({
                    "type": "plotly",
                    "data": fig.get("data")
                })
    
    # Add logs to response
    if result.logs:
        response["logs"] = result.logs
    
    return response


def generate_reflection(
    code: str,
    error: str,
    attempt: int
) -> str:
    """
    Generate a reflection on why code failed (for learning).
    
    Args:
        code: The failed code
        error: Error message
        attempt: Which attempt number this is
    
    Returns:
        Reflection text explaining the failure
    """
    prompt = f"""Attempt {attempt} failed with this code:

```python
{code}
```

Error: {error}

Provide a brief reflection (2-3 sentences) on:
1. What went wrong
2. What should be done differently
"""
    
    return fast_complete(
        messages=[{"role": "user", "content": prompt}],
        system_prompt="You are a code debugger. Provide concise, actionable reflections.",
        temperature=0.3,
        max_tokens=200
    )
