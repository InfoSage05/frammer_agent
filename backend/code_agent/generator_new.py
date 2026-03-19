"""
Code Generation and Execution with proper error correction loop.
Used as a TOOL by the planning agent.
"""
import logging
import subprocess
import tempfile
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("frammer.code_agent")


def generate_and_execute_code(
    task_description: str,
    requirements: Dict[str, Any],
    session_id: str,
    max_retries: int = 3
) -> Dict[str, Any]:
    """
    Generate code to accomplish a task, execute it, and return results.
    
    Args:
        task_description: What to compute/analyze
        requirements: Dict with "datasets", "columns", "operations"
        session_id: Session ID
        max_retries: Maximum retry attempts
    
    Returns:
        Dict with success, data, charts, error
    """
    from ..llm.groq_client import fast_complete, think_complete
    from ..context_manager.registry import get_registry
    
    registry = get_registry()
    
    # Get dataset info
    dataset_info = []
    for ds_id in requirements.get("datasets", []):
        ds = registry.get_dataset(ds_id)
        if ds:
            dataset_info.append({
                "id": ds_id,
                "name": ds.get("name"),
                "path": ds.get("filepath"),
                "columns": ds.get("columns", [])
            })
    
    code = None
    last_error = None
    
    for attempt in range(max_retries):
        logger.info(f"🔄 Code generation attempt {attempt+1}/{max_retries}")
        
        # Choose LLM based on attempt
        if attempt < 2:
            # Use fast model first
            llm_func = fast_complete
            model_name = "fast"
        else:
            # Escalate to thinking model
            llm_func = think_complete
            model_name = "thinking"
        
        # Generate code
        if attempt == 0:
            code = _generate_initial_code(
                task_description, dataset_info, requirements, llm_func
            )
        else:
            # Retry with error feedback
            code = _fix_code_with_error(
                code, last_error, task_description, dataset_info, llm_func
            )
        
        if not code:
            logger.error(f"❌ No code generated on attempt {attempt+1}")
            continue
        
        logger.info(f"Generated code ({len(code)} chars)")
        logger.debug(f"Code:\n{code}")
        
        # Execute
        result = _execute_code_safely(code, session_id)
        
        if result.get("success"):
            logger.info(f"✅ Code executed successfully!")
            return result
        else:
            last_error = result.get("error", "Unknown error")
            logger.warning(f"⚠️ Execution failed: {last_error[:200]}")
    
    # All attempts failed
    logger.error(f"❌ All {max_retries} attempts failed")
    return {
        "success": False,
        "error": f"Failed after {max_retries} attempts. Last error: {last_error}",
        "data": None,
        "charts": []
    }


def _generate_initial_code(
    task: str,
    datasets: list,
    requirements: dict,
    llm_func
) -> Optional[str]:
    """Generate initial code."""
    
    prompt = f"""
You are a code generation agent. Generate Python code to accomplish this task:

Task: {task}

Available datasets:
{json.dumps(datasets, indent=2)}

Requirements:
{json.dumps(requirements, indent=2)}

Generate ONLY the Python code. Follow these rules:
1. Import all needed libraries at the top
2. Load datasets using their provided file paths
3. Perform the requested analysis
4. Output results as JSON to stdout in this format:
   {{
     "success": true,
     "data": {{"key": "value"}},
     "charts": [{{"type": "bar", "data": [...], "title": "..."}}]
   }}
5. If generating charts, return chart DATA (not images), formatted for Recharts/Plotly.js
6. Handle errors gracefully

Return ONLY the code, no explanations, no markdown fences.
"""
    
    try:
        response = llm_func(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="You are a precise code generator. Output only valid Python code.",
            temperature=0.3,
            max_tokens=2000
        )
        
        # Clean response
        code = _clean_code(response)
        return code
    
    except Exception as e:
        logger.error(f"Code generation error: {e}")
        return None


def _fix_code_with_error(
    previous_code: str,
    error: str,
    task: str,
    datasets: list,
    llm_func
) -> Optional[str]:
    """Fix code based on error feedback."""
    
    prompt = f"""
The following code failed with an error. Fix it.

Original task: {task}

Available datasets:
{json.dumps(datasets, indent=2)}

Previous code:
```python
{previous_code}
```

Error:
{error}

Generate the CORRECTED code. Rules:
1. Fix the specific error
2. Keep the same overall structure
3. Output results as JSON
4. Return ONLY the code, no markdown, no explanations
"""
    
    try:
        response = llm_func(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="You are a code debugger. Fix errors precisely.",
            temperature=0.2,
            max_tokens=2000
        )
        
        code = _clean_code(response)
        return code
    
    except Exception as e:
        logger.error(f"Code fixing error: {e}")
        return None


def _clean_code(response: str) -> str:
    """Remove markdown fences and extract code."""
    # Remove markdown code fences
    response = re.sub(r'```python\s*', '', response)
    response = re.sub(r'```\s*', '', response)
    response = response.strip()
    return response


def _execute_code_safely(code: str, session_id: str) -> Dict[str, Any]:
    """Execute code in a subprocess with timeout."""
    import sys
    
    # Create temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(code)
        temp_path = f.name
    
    try:
        # Run with timeout
        result = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=30,  # 30 second timeout
            encoding='utf-8',
            errors='replace'
        )
        
        # Check for errors
        if result.returncode != 0:
            return {
                "success": False,
                "error": result.stderr or "Unknown error",
                "data": None,
                "charts": []
            }
        
        # Parse output
        try:
            output = json.loads(result.stdout.strip())
            return output
        except json.JSONDecodeError:
            # Output wasn't JSON, return as text
            return {
                "success": True,
                "data": {"result": result.stdout.strip()},
                "charts": []
            }
    
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Code execution timed out (30s limit)",
            "data": None,
            "charts": []
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": None,
            "charts": []
        }
    
    finally:
        # Clean up temp file
        try:
            Path(temp_path).unlink()
        except:
            pass
