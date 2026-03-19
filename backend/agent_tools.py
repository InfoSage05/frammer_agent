"""
Tools available to the planning agent

Uses DBMS preset functions for data access.
"""
import json
import sys
from pathlib import Path

# Setup path
_backend_dir = Path(__file__).parent
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_backend_dir.parent))

from dbms import list_datasets, get_schema, get_first_rows, get_stats, get_full_dataset


def tool_list_datasets() -> str:
    """List all available datasets with columns"""
    datasets = list_datasets()
    
    result = "Available Datasets:\n\n"
    for ds in datasets:
        result += f"**{ds['name']}** ({ds['row_count']} rows)\n"
        result += f"  Columns: {', '.join(ds['columns'])}\n\n"
    
    return result


def tool_get_schema(dataset_name: str) -> str:
    """Get detailed schema for a dataset"""
    try:
        schema = get_schema(dataset_name)
        return json.dumps(schema, indent=2, default=str)
    except ValueError as e:
        return str(e)


def tool_get_first_rows(dataset_name: str, n: int = 5) -> str:
    """Get first n rows of a dataset"""
    try:
        df = get_first_rows(dataset_name, n)
        return df.to_string(index=False)
    except ValueError as e:
        return str(e)


def tool_get_stats(dataset_name: str, column: str) -> str:
    """Get statistics for a specific column"""
    try:
        stats = get_stats(dataset_name, column)
        return json.dumps(stats, indent=2, default=str)
    except ValueError as e:
        return str(e)


def tool_execute_code(code: str, description: str = "") -> str:
    """Execute Python code and return results"""
    from code_agent.executor import execute_code_with_retry, clean_code
    
    # Clean code before execution
    code = clean_code(code)
    
    print(f"  [EXEC] Running code ({len(code)} chars)...")
    result = execute_code_with_retry(code, description)
    return json.dumps(result, indent=2, default=str)


# Tool registry for LLM
AVAILABLE_TOOLS = {
    "list_datasets": {
        "description": "List all available datasets with their columns and row counts",
        "parameters": {},
        "function": tool_list_datasets
    },
    "get_schema": {
        "description": "Get detailed schema for a dataset including column types, sample values, and null percentages",
        "parameters": {
            "dataset_name": "Name of the dataset (string)"
        },
        "function": tool_get_schema
    },
    "get_first_rows": {
        "description": "Get the first n rows of a dataset to preview the data",
        "parameters": {
            "dataset_name": "Name of the dataset (string)",
            "n": "Number of rows to return (int, default 5)"
        },
        "function": tool_get_first_rows
    },
    "get_stats": {
        "description": "Get statistics for a specific column (min, max, mean, std for numeric; top values for categorical)",
        "parameters": {
            "dataset_name": "Name of the dataset (string)",
            "column": "Column name (string)"
        },
        "function": tool_get_stats
    },
    "execute_code": {
        "description": """Execute Python code to analyze data. The code has access to:
- get_full_dataset(name): Load a dataset by name (returns DataFrame)
- create_chart(chart_type, title, data, x_key, y_keys): Create chart for frontend
- create_table(title, data, columns): Create table for frontend
- pandas, numpy are pre-imported

IMPORTANT: Code MUST end with: print(json.dumps(RESULT))
where RESULT = {"data": any, "charts": [chart_objects], "tables": [], "summary": "text"}""",
        "parameters": {
            "code": "Complete Python code to execute (string)",
            "description": "Brief description of what this code does (string)"
        },
        "function": tool_execute_code
    }
}


def get_tools_description() -> str:
    """Get description of all available tools for LLM prompt"""
    desc = "**Available Tools:**\n\n"
    for name, info in AVAILABLE_TOOLS.items():
        desc += f"Tool: `{name}`\n"
        desc += f"  Description: {info['description']}\n"
        if info['parameters']:
            desc += f"  Parameters:\n"
            for param, pdesc in info['parameters'].items():
                desc += f"    - {param}: {pdesc}\n"
        desc += "\n"
    return desc


def execute_tool(tool_name: str, **kwargs) -> str:
    """Execute a tool by name"""
    if tool_name not in AVAILABLE_TOOLS:
        return f"Error: Tool '{tool_name}' not found. Available tools: {list(AVAILABLE_TOOLS.keys())}"
    
    try:
        tool_info = AVAILABLE_TOOLS[tool_name]
        expected_params = set(tool_info["parameters"].keys())
        
        # Filter kwargs to only include expected parameters
        if expected_params:
            filtered_kwargs = {k: v for k, v in kwargs.items() if k in expected_params}
        else:
            # Tool takes no parameters
            filtered_kwargs = {}
        
        result = tool_info["function"](**filtered_kwargs)
        return str(result)
    except Exception as e:
        import traceback
        return f"Tool execution error: {str(e)}\n{traceback.format_exc()}"
