"""
Sandboxed Code Execution - Execute generated Python code safely with retry logic.
Implements Reflexion-style error correction.
"""
import os
import sys
import re
import json
import traceback
import subprocess
import tempfile
import base64
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from config import CODE_EXECUTION_TIMEOUT, MAX_RETRY_ATTEMPTS, DATA_DIR
from context_manager.registry import get_registry
from code_agent.generator import generate_analysis_code, generate_fix_code, generate_reflection, generate_fix_code_with_thinking

# Set up logger
logger = logging.getLogger("frammer.sandbox")


class ExecutionResult:
    """Result of code execution."""
    
    def __init__(self):
        self.success: bool = False
        self.tables: List[Dict[str, Any]] = []
        self.figures: List[Dict[str, Any]] = []
        self.logs: List[str] = []
        self.error: Optional[str] = None
        self.code: str = ""
        self.execution_time: float = 0.0
        self.reflections: List[str] = []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "tables": self.tables,
            "figures": self.figures,
            "logs": self.logs,
            "error": self.error,
            "code": self.code,
            "execution_time": self.execution_time,
            "reflections": self.reflections
        }


class CodeSandbox:
    """Sandboxed Python code execution environment."""
    
    def __init__(self):
        self.registry = get_registry()
        self.temp_dir = Path(tempfile.mkdtemp(prefix="frammer_sandbox_"))
    
    def execute_with_retry(
        self,
        task: str,
        dataset_ids: List[int],
        max_attempts: int = MAX_RETRY_ATTEMPTS
    ) -> ExecutionResult:
        """
        Execute analysis task with automatic retry on failure.
        Implements Reflexion pattern: generate → execute → reflect → retry.
        """
        result = ExecutionResult()
        
        logger.info(f"Starting analysis: {task[:100]}...")
        logger.debug(f"Dataset IDs: {dataset_ids}")
        
        # Get dataset schemas
        datasets = []
        for ds_id in dataset_ids:
            ds = self.registry.get_dataset(ds_id)
            if ds:
                datasets.append(ds)
                logger.debug(f"Loaded dataset: {ds.get('name', ds_id)}")
        
        if not datasets:
            result.error = "No valid datasets found"
            logger.error(result.error)
            return result
        
        # Generate initial code
        logger.info("Generating analysis code...")
        code = generate_analysis_code(task, datasets)
        logger.debug(f"Generated code ({len(code)} chars):\n{code[:500]}...")
        
        for attempt in range(1, max_attempts + 1):
            result.code = code
            result.logs.append(f"Attempt {attempt}/{max_attempts}")
            logger.info(f"Execution attempt {attempt}/{max_attempts}")
            
            # Execute
            success, output, error = self._execute_code(code, datasets)
            
            if success:
                result.success = True
                result.logs.extend(output.get("logs", []))
                result.tables = output.get("tables", [])
                result.figures = output.get("figures", [])
                # Also capture chart_data and metrics
                if output.get("chart_data"):
                    for cd in output["chart_data"]:
                        result.figures.append({"type": "chart", "name": "chart", "data": cd})
                if output.get("metrics"):
                    for m in output["metrics"]:
                        result.logs.append(f"Metric: {m.get('name', 'result')} = {m.get('value', 'N/A')}")
                logger.info(f"✓ Execution succeeded: {len(result.tables)} tables, {len(result.figures)} figures")
                return result
            
            # Failed - log the error
            logger.warning(f"Attempt {attempt} failed: {error[:200]}...")
            result.logs.append(f"Attempt {attempt} failed: {error[:100]}")
            
            if attempt < max_attempts:
                logger.info("Generating reflection and fix...")
                reflection = generate_reflection(code, error, attempt)
                result.reflections.append(reflection)
                result.logs.append(f"Reflection: {reflection}")
                logger.debug(f"Reflection: {reflection}")
                
                # Build dataset schema context for better fixes
                dataset_schema_context = ""
                for ds in datasets:
                    ds_info = f"\nDataset '{ds['name']}':\n"
                    for col in ds.get("columns", [])[:15]:
                        ds_info += f"  - {col['name']} ({col.get('dtype', 'unknown')})\n"
                    dataset_schema_context += ds_info
                
                # Use thinking LLM on last retry attempt for complex fixes
                if attempt >= max_attempts - 1:
                    logger.info("Escalating to thinking LLM for complex fix...")
                    code = generate_fix_code_with_thinking(
                        code, error, task, 
                        dataset_schema_context,
                        reflections=result.reflections
                    )
                else:
                    # Generate fixed code with fast LLM
                    code = generate_fix_code(code, error, task, dataset_schema_context)
                logger.debug(f"Fixed code ({len(code)} chars):\n{code[:500]}...")
        
        # All attempts failed
        result.success = False
        result.error = error
        logger.error(f"All {max_attempts} attempts failed. Last error: {error[:200]}")
        return result
    
    def _execute_code(
        self,
        code: str,
        datasets: List[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any], str]:
        """
        Execute Python code in a subprocess sandbox.
        
        Returns:
            (success, output_dict, error_message)
        """
        # Create execution script
        script = self._build_execution_script(code, datasets)
        
        # Write to temp file
        timestamp = datetime.now().strftime('%H%M%S%f')
        script_path = self.temp_dir / f"exec_{timestamp}.py"
        output_path = self.temp_dir / f"output_{timestamp}.json"
        
        script_path.write_text(script, encoding="utf-8")
        logger.debug(f"Script written to: {script_path}")
        
        # Also save to logs folder for debugging
        try:
            from config import LOG_DIR
            log_script_path = LOG_DIR / f"last_script_{timestamp[:6]}.py"
            log_script_path.write_text(script, encoding="utf-8")
            logger.debug(f"Script also saved to: {log_script_path}")
        except Exception as e:
            logger.warning(f"Could not save script to logs: {e}")
        
        try:
            # Execute in subprocess with timeout
            logger.info(f"Executing script (timeout: {CODE_EXECUTION_TIMEOUT}s)...")
            result = subprocess.run(
                [sys.executable, str(script_path)],
                capture_output=True,
                text=True,
                timeout=CODE_EXECUTION_TIMEOUT,
                cwd=str(self.temp_dir),
                env={**os.environ, "OUTPUT_PATH": str(output_path)}
            )
            
            # Log stdout/stderr
            if result.stdout:
                logger.debug(f"STDOUT: {result.stdout[:500]}")
            if result.stderr:
                logger.debug(f"STDERR: {result.stderr[:500]}")
            
            # Check for errors
            if result.returncode != 0:
                error = result.stderr or result.stdout or "Unknown error"
                logger.warning(f"Script failed (return code {result.returncode})")
                return False, {}, error
            
            # Read output
            if output_path.exists():
                output = json.loads(output_path.read_text(encoding="utf-8"))
                output["logs"] = [result.stdout] if result.stdout else []
                logger.info(f"Output: {len(output.get('tables', []))} tables, {len(output.get('figures', []))} figures")
                return True, output, ""
            else:
                logger.info("No output file generated, using stdout only")
                return True, {"logs": [result.stdout] if result.stdout else []}, ""
                
        except subprocess.TimeoutExpired:
            error = f"Execution timed out after {CODE_EXECUTION_TIMEOUT}s"
            logger.error(error)
            return False, {}, error
        except Exception as e:
            logger.exception(f"Execution error: {e}")
            return False, {}, str(e)
    
    def _build_execution_script(
        self,
        code: str,
        datasets: List[Dict[str, Any]]
    ) -> str:
        """Build the complete execution script with data loading and output capture."""
        
        # Generate data loading code
        load_code = [
            "# ─── Imports ───",
            "import pandas as pd",
            "import numpy as np",
            "import matplotlib",
            "matplotlib.use('Agg')",
            "import matplotlib.pyplot as plt",
            "import seaborn as sns",
            "import json",
            "import os",
            "import base64",
            "import warnings",
            "from io import BytesIO",
            "warnings.filterwarnings('ignore')",
            "",
            "# ─── Load Datasets ───",
        ]
        
        # Load datasets with simple names (df, df_1, df_2, etc.)
        for i, ds in enumerate(datasets):
            file_path = ds.get("file_path", "")
            if not file_path:
                logger.warning(f"Dataset {ds.get('name')} has no file_path")
                continue
            
            # Escape backslashes for Windows paths
            escaped_path = file_path.replace('\\', '\\\\')
            
            if i == 0:
                load_code.append(f'df = pd.read_csv(r"{file_path}", encoding="utf-8-sig")')
                load_code.append(f'df_0 = df  # Alias for consistency')
                logger.debug(f"Loading main dataset from: {file_path}")
            else:
                load_code.append(f'df_{i} = pd.read_csv(r"{file_path}", encoding="utf-8-sig")')
            
            # Create safe named variable for backward compatibility
            safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', ds.get('name', f'dataset_{i}'))
            if i == 0:
                load_code.append(f'{safe_name} = df')
            else:
                load_code.append(f'{safe_name} = df_{i}')
        
        load_code.extend([
            "",
            "# Print dataset info for debugging",
            "print(f'Loaded df with shape: {df.shape}')",
            "print(f'Columns: {list(df.columns)}')",
            "",
            "# ─── Initialize Result Variables ───",
            "result_df = None",
            "result_value = None",
            "chart_data = None",
            "",
            "# ─── User Analysis Code ───",
        ])
        
        # Output capture code
        output_code = """

# ─── Output Capture ───────────────────────────────────────────────────────────
_output = {"tables": [], "figures": [], "chart_data": [], "metrics": []}

# Capture DataFrames
if result_df is not None:
    try:
        _output["tables"].append({
            "name": "result",
            "columns": list(result_df.columns),
            "data": result_df.head(100).to_dict(orient='records'),
            "shape": list(result_df.shape)
        })
        print(f"Captured result_df with shape {result_df.shape}")
    except Exception as e:
        print(f"Error capturing result_df: {e}")

# Capture chart_data for Recharts
if chart_data is not None:
    _output["chart_data"].append(chart_data)
    print(f"Captured chart_data with {len(chart_data) if isinstance(chart_data, list) else 1} items")

# Capture single metrics
if result_value is not None:
    _output["metrics"].append({"name": "result", "value": result_value})
    print(f"Captured result_value: {result_value}")

# Capture matplotlib figures as base64
fig_nums = plt.get_fignums()
print(f"Found {len(fig_nums)} matplotlib figures")
for i, fig_num in enumerate(fig_nums):
    try:
        fig = plt.figure(fig_num)
        buf = BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='#0f172a', edgecolor='none')
        buf.seek(0)
        _output["figures"].append({
            "name": f"figure_{i}",
            "type": "image",
            "data": base64.b64encode(buf.read()).decode('utf-8')
        })
        plt.close(fig)
        print(f"Captured figure_{i}")
    except Exception as e:
        print(f"Error capturing figure {i}: {e}")

# Capture plotly figures if any
if 'plotly_fig' in dir() and plotly_fig is not None:
    try:
        _output["figures"].append({
            "name": "plotly_figure",
            "type": "plotly",
            "data": plotly_fig.to_json()
        })
        print("Captured plotly figure")
    except Exception as e:
        print(f"Error capturing plotly figure: {e}")

# Write output to file
output_path = os.environ.get('OUTPUT_PATH', 'output.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(_output, f, default=str)
print(f"Output written to {output_path}")
"""
        
        # Combine everything
        full_script = "\n".join(load_code) + "\n" + code + "\n" + output_code
        return full_script
    
    def cleanup(self):
        """Clean up temporary files."""
        import shutil
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir, ignore_errors=True)


# ─── Module Functions ────────────────────────────────────────────────────────

def execute_analysis(
    task: str,
    dataset_ids: List[int]
) -> ExecutionResult:
    """
    Execute a data analysis task.
    
    Args:
        task: Natural language task description
        dataset_ids: Dataset IDs to use
    
    Returns:
        ExecutionResult with outputs
    """
    sandbox = CodeSandbox()
    try:
        return sandbox.execute_with_retry(task, dataset_ids)
    finally:
        sandbox.cleanup()
