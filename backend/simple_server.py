"""
Frammer Agent Server - Full Agentic AI System
Implements: Planning → Routing → Code Execution → Result Extraction
Never shows code to user - only results
"""
import os
import sys
import json
import re
import uuid
import subprocess
import tempfile
import base64
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from io import StringIO

# Setup paths
_backend_dir = Path(__file__).parent
_agent_dir = _backend_dir.parent
_project_dir = _agent_dir.parent
sys.path.insert(0, str(_project_dir))
sys.path.insert(0, str(_agent_dir))

# Load environment
from dotenv import load_dotenv
load_dotenv(_agent_dir / ".env")

# Setup logging
LOG_DIR = _agent_dir / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"frammer_{datetime.now().strftime('%Y%m%d')}.log"

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("frammer.server")
logger.info(f"Logging to: {LOG_FILE}")

# Load environment
from dotenv import load_dotenv
load_dotenv(_agent_dir / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import pandas as pd

# Configuration
DATA_DIR = os.getenv("FRAMMER_DATA_DIR", str(_project_dir))
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

app = FastAPI(title="Frammer Agent API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
# LLM CLIENT (inline to avoid import issues)
# ══════════════════════════════════════════════════════════════════════════════

from groq import Groq

FAST_MODEL = "llama-3.1-8b-instant"
THINK_MODEL = "llama-3.3-70b-versatile"

_groq_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None:
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set")
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client


def llm_fast(messages: List[Dict], system: str = "", temp: float = 0.7) -> str:
    """Fast LLM for code gen, routing."""
    client = get_groq_client()
    full_msgs = [{"role": "system", "content": system}] if system else []
    full_msgs.extend(messages)
    resp = client.chat.completions.create(
        model=FAST_MODEL, messages=full_msgs, temperature=temp, max_tokens=2048
    )
    return resp.choices[0].message.content or ""


def llm_think(messages: List[Dict], system: str = "", temp: float = 0.5) -> str:
    """Deep thinking LLM for planning, insights."""
    client = get_groq_client()
    full_msgs = [{"role": "system", "content": system}] if system else []
    full_msgs.extend(messages)
    resp = client.chat.completions.create(
        model=THINK_MODEL, messages=full_msgs, temperature=temp, max_tokens=4096
    )
    return resp.choices[0].message.content or ""


# ══════════════════════════════════════════════════════════════════════════════
# DATA LAYER - Load and profile datasets
# ══════════════════════════════════════════════════════════════════════════════

class DataRegistry:
    """Manages all datasets and their schemas."""
    
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.datasets: Dict[str, Dict] = {}
        self.kpis: Dict[str, Any] = {}
        self._load_all()
    
    def _load_all(self):
        """Load and profile all CSV files."""
        print(f"📊 Loading datasets from {self.data_dir}")
        
        for csv_file in self.data_dir.glob("*.csv"):
            try:
                df = pd.read_csv(csv_file, encoding="utf-8-sig", nrows=1000)
                schema = self._profile_df(df, csv_file.stem)
                self.datasets[csv_file.stem] = {
                    "name": csv_file.stem,
                    "path": str(csv_file),
                    "rows": len(df),
                    "columns": list(df.columns),
                    "schema": schema,
                    "sample": df.head(5).to_dict(orient="records")
                }
                print(f"  ✓ {csv_file.stem}: {len(df)} rows, {len(df.columns)} cols")
            except Exception as e:
                print(f"  ✗ {csv_file.stem}: {e}")
        
        # Compute KPIs from main dataset
        self._compute_kpis()
    
    def _profile_df(self, df: pd.DataFrame, name: str) -> List[Dict]:
        """Profile columns in a dataframe."""
        schema = []
        for col in df.columns:
            info = {
                "name": col,
                "dtype": str(df[col].dtype),
                "null_pct": round(df[col].isnull().mean() * 100, 1),
                "unique": df[col].nunique(),
                "sample_values": df[col].dropna().head(3).tolist()
            }
            if df[col].dtype in ["int64", "float64"]:
                info["min"] = float(df[col].min()) if not pd.isna(df[col].min()) else None
                info["max"] = float(df[col].max()) if not pd.isna(df[col].max()) else None
                info["mean"] = float(df[col].mean()) if not pd.isna(df[col].mean()) else None
            schema.append(info)
        return schema
    
    def _compute_kpis(self):
        """Compute KPIs from main dataset."""
        # Try to load main dataset
        main_ds = None
        for name in ["combined_data(2025-3-1-2026-2-28)", "CLIENT 1 combined_data(2025-3-1-2026-2-28)"]:
            if name in self.datasets:
                main_ds = name
                break
        
        if main_ds:
            df = pd.read_csv(self.datasets[main_ds]["path"], encoding="utf-8-sig")
            
            # Status columns detection (dataset agnostic)
            status_col = None
            for col in df.columns:
                if "status" in col.lower():
                    status_col = col
                    break
            
            if status_col:
                uploaded = len(df[df[status_col].str.lower().str.contains("upload", na=False)])
                processed = len(df[df[status_col].str.lower().str.contains("process|creat", na=False)])
                published = len(df[df[status_col].str.lower().str.contains("publish", na=False)])
            else:
                uploaded = len(df)
                processed = 0
                published = 0
            
            self.kpis = {
                "total_rows": len(df),
                "uploaded": uploaded if uploaded > 0 else len(df),
                "processed": processed,
                "published": published,
                "publish_rate": round(published / max(processed, 1) * 100, 2),
                "columns": list(df.columns),
                "date_range": "Mar 2025 - Feb 2026"
            }
        else:
            self.kpis = {"total_rows": 0, "uploaded": 0, "processed": 0, "published": 0}
    
    def get_context_for_llm(self) -> str:
        """Generate context string for LLM."""
        ctx = ["## Available Datasets\n"]
        for name, ds in self.datasets.items():
            ctx.append(f"### {name}")
            ctx.append(f"- Rows: {ds['rows']}, Columns: {len(ds['columns'])}")
            ctx.append(f"- Columns: {', '.join(ds['columns'][:15])}")
            if len(ds['columns']) > 15:
                ctx.append(f"  ... and {len(ds['columns']) - 15} more")
            ctx.append("")
        
        ctx.append("## Current KPIs")
        for k, v in self.kpis.items():
            if k != "columns":
                ctx.append(f"- {k}: {v}")
        
        return "\n".join(ctx)
    
    def get_dataset_path(self, name: str) -> Optional[str]:
        """Get path to a dataset by name (fuzzy match)."""
        name_lower = name.lower().replace(" ", "").replace("_", "").replace("-", "")
        for ds_name, ds in self.datasets.items():
            if name_lower in ds_name.lower().replace(" ", "").replace("_", "").replace("-", ""):
                return ds["path"]
        return None


# Global registry
_registry: Optional[DataRegistry] = None

def get_registry() -> DataRegistry:
    global _registry
    if _registry is None:
        _registry = DataRegistry(DATA_DIR)
    return _registry


# ══════════════════════════════════════════════════════════════════════════════
# PLANNING AGENT - Classifies intent and creates execution plan
# ══════════════════════════════════════════════════════════════════════════════

INTENT_TYPES = ["ANSWER", "ANALYZE", "PLOT", "COMPARE", "UNKNOWN"]

PLANNER_SYSTEM = """You are a query planner for a data analytics system. Analyze the user's query and output a JSON plan.

OUTPUT FORMAT (strict JSON, no markdown):
{
    "intent": "ANSWER|ANALYZE|PLOT|COMPARE",
    "requires_code": true|false,
    "datasets_needed": ["dataset_name1", "dataset_name2"],
    "analysis_type": "description of what analysis to perform",
    "output_type": "text|chart|table|chart_and_text",
    "chart_config": {
        "type": "bar|line|pie|area|scatter",
        "title": "Chart Title",
        "x_axis": "column_for_x",
        "y_axis": "column_for_y",
        "group_by": "optional_grouping_column"
    }
}

INTENT DEFINITIONS:
- ANSWER: Simple question that can be answered from existing KPIs/knowledge
- ANALYZE: Requires computing new metrics from data
- PLOT: Requires generating a visualization
- COMPARE: Requires comparing multiple metrics/entities

Be precise about which datasets and columns are needed. Use exact column names from the schema."""


def plan_query(query: str, context: str) -> Dict:
    """Use thinking LLM to plan query execution."""
    logger.info(f"🧠 Planning query: {query[:80]}...")
    
    prompt = f"""USER QUERY: {query}

AVAILABLE DATA:
{context}

Create an execution plan. Output ONLY valid JSON."""

    try:
        response = llm_think([{"role": "user", "content": prompt}], system=PLANNER_SYSTEM, temp=0.3)
        logger.debug(f"Plan response: {response[:200]}...")
        
        # Extract JSON from response
        response = response.strip()
        if response.startswith("```"):
            response = re.sub(r"```json?\n?", "", response)
            response = response.replace("```", "")
        
        plan = json.loads(response)
        logger.info(f"📋 Plan: intent={plan.get('intent')}, requires_code={plan.get('requires_code')}")
        return plan
    except Exception as e:
        logger.warning(f"Planning failed: {e}")
        print(f"Planning error: {e}")
        return {
            "intent": "ANSWER",
            "requires_code": False,
            "datasets_needed": [],
            "analysis_type": "direct_answer",
            "output_type": "text"
        }


# ══════════════════════════════════════════════════════════════════════════════
# CODE AGENT - Generates and executes Python code
# ══════════════════════════════════════════════════════════════════════════════

CODE_GEN_SYSTEM = """You are a Python data analyst. Generate clean, executable code.

CRITICAL: Return ONLY Python code - no markdown, no backticks, no explanations.

RULES:
1. Use pandas, numpy for analysis
2. DataFrames are pre-loaded as df_0, df_1, etc. (ALREADY LOADED - do not load again)
3. For charts: save structured data to result_chart_data dict
4. For tables: save to result_table as list of dicts  
5. For metrics: save to result_metrics dict
6. Print insights using print()
7. DO NOT create matplotlib figures - we only want DATA for frontend rendering
8. Handle missing values with .fillna(0) or .dropna()
9. Use EXACT column names from the schema - case sensitive!
10. Always check if columns exist: if 'Column Name' in df_0.columns
11. NEVER use .tolist() on scalar values - only on Series/arrays
12. Always verify data types before operations

CHART DATA FORMAT (for React Recharts frontend):
result_chart_data = {
    "type": "bar",  # bar|line|pie|area|scatter
    "title": "Chart Title",
    "labels": ["label1", "label2", ...],  # Must be a list
    "datasets": [
        {"name": "Series 1", "values": [1.0, 2.0, 3.0, ...]},  # values must be list of numbers
    ]
}

IMPORTANT FOR VALUES:
- All values in "values" must be a LIST of numbers, not a single number
- Use .tolist() ONLY on pandas Series or numpy arrays
- If you have a scalar, wrap it in a list: [scalar_value]
- Always use .fillna(0) before .tolist() to avoid NaN issues
- Example: series.fillna(0).tolist()

START DIRECTLY WITH PYTHON CODE. NO EXPLANATIONS. NO MARKDOWN."""


def generate_code(task: str, datasets: List[Dict], plan: Dict) -> str:
    """Generate Python code for the analysis task."""
    ds_context = []
    for i, ds in enumerate(datasets):
        ds_context.append(f"df_{i}: '{ds['name']}' (already loaded)")
        ds_context.append(f"  Shape: {ds['rows']} rows x {len(ds['columns'])} columns")
        ds_context.append(f"  Columns (EXACT names, case-sensitive):")
        
        # Show all columns for better context
        for col in ds['columns']:
            ds_context.append(f"    - '{col}'")
        
        # Include sample values for better context
        schema_sample = ds.get('schema', [])[:10]
        ds_context.append(f"  Column details:")
        for col_info in schema_sample:
            col_name = col_info['name']
            dtype = col_info['dtype']
            samples = col_info.get('sample_values', [])[:3]
            ds_context.append(f"    '{col_name}' ({dtype}): {samples}")
    
    prompt = f"""TASK: {task}

PLAN:
{json.dumps(plan, indent=2)}

AVAILABLE DATA:
{chr(10).join(ds_context)}

IMPORTANT REMINDERS:
- DataFrames df_0, df_1, etc. are ALREADY LOADED - do NOT use pd.read_csv
- Use EXACT column names in quotes: df_0['Column Name'] (case-sensitive!)
- Save results to: result_chart_data, result_table, result_metrics
- Convert Series to list with .tolist()
- Handle NaN: .fillna(0) before .tolist()

OUTPUT ONLY PYTHON CODE - no markdown, no explanations."""

    code = llm_fast([{"role": "user", "content": prompt}], system=CODE_GEN_SYSTEM, temp=0.2)
    code = clean_code_output(code)
    logger.debug(f"Generated code ({len(code)} chars):\n{code[:300]}...")
    return code


def execute_code(code: str, dataset_paths: List[str]) -> Dict:
    """Execute Python code in subprocess and extract results."""
    logger.info(f"⚙️ Executing code ({len(code)} chars) with {len(dataset_paths)} datasets")
    
    # Build execution script
    script_lines = [
        "import pandas as pd",
        "import numpy as np",
        "import json",
        "import sys",
        "import warnings",
        "warnings.filterwarnings('ignore')",
        "",
        "# Initialize result containers",
        "result_chart_data = None",
        "result_table = None", 
        "result_metrics = {}",
        "",
        "# Load datasets"
    ]
    
    for i, path in enumerate(dataset_paths):
        script_lines.append(f'print(f"Loading df_{i} from {path[-50:]}...")')
        script_lines.append(f'df_{i} = pd.read_csv(r"{path}", encoding="utf-8-sig")')
        script_lines.append(f'print(f"  Shape: {{df_{i}.shape}}")')
        script_lines.append(f'print(f"  Columns: {{list(df_{i}.columns)}}")')
    
    script_lines.append("")
    script_lines.append("# ═══ USER CODE START ═══")
    script_lines.append(code)
    script_lines.append("# ═══ USER CODE END ═══")
    script_lines.append("")
    script_lines.append("# Output results as JSON")
    script_lines.append("try:")
    script_lines.append("    output = {")
    script_lines.append('        "chart_data": result_chart_data,')
    script_lines.append('        "table": result_table[:100] if result_table else None,')
    script_lines.append('        "metrics": result_metrics')
    script_lines.append("    }")
    script_lines.append("    print('__RESULT_JSON__')")
    script_lines.append("    print(json.dumps(output, default=str))")
    script_lines.append("except Exception as e:")
    script_lines.append("    print(f'Error formatting output: {e}')")
    script_lines.append("    print('__RESULT_JSON__')")
    script_lines.append("    print(json.dumps({'chart_data': None, 'table': None, 'metrics': {}}))")
    
    full_script = "\n".join(script_lines)
    
    # Save script for debugging
    debug_script_path = LOG_DIR / f"last_script_{datetime.now().strftime('%H%M%S')}.py"
    debug_script_path.write_text(full_script, encoding='utf-8')
    logger.debug(f"Script saved to: {debug_script_path}")
    
    # Log the actual code being executed
    logger.debug(f"Code being executed:\n{code}")
    
    # Execute in subprocess
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(full_script)
        script_path = f.name
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=60,  # Increased timeout
            cwd=str(Path(DATA_DIR))
        )
        
        stdout = result.stdout
        stderr = result.stderr
        
        logger.debug(f"STDOUT:\n{stdout[:500]}...")
        if stderr:
            logger.debug(f"STDERR:\n{stderr[:500]}...")
        
        if result.returncode != 0:
            error_msg = stderr or stdout or "Unknown error"
            logger.warning(f"Execution failed (code {result.returncode}): {error_msg[:200]}")
            return {"success": False, "error": error_msg, "logs": stdout}
        
        # Extract JSON result
        if "__RESULT_JSON__" in stdout:
            json_str = stdout.split("__RESULT_JSON__")[1].strip()
            # Take only the first line (the JSON)
            json_str = json_str.split('\n')[0].strip()
            try:
                output = json.loads(json_str)
            except json.JSONDecodeError as je:
                logger.warning(f"JSON decode error: {je}, string was: {json_str[:200]}")
                output = {"chart_data": None, "table": None, "metrics": {}}
            
            logs = stdout.split("__RESULT_JSON__")[0].strip()
            logger.info(f"✅ Execution success: chart={output.get('chart_data') is not None}, table={output.get('table') is not None}")
            return {"success": True, "output": output, "logs": logs}
        else:
            logger.info("Execution complete but no result marker found")
            return {"success": True, "output": {}, "logs": stdout}
            
    except subprocess.TimeoutExpired:
        logger.error("Execution timed out (60s)")
        return {"success": False, "error": "Execution timed out (60s)", "logs": ""}
    except Exception as e:
        logger.exception(f"Execution error: {e}")
        return {"success": False, "error": str(e), "logs": ""}
    finally:
        Path(script_path).unlink(missing_ok=True)


def clean_code_output(code: str) -> str:
    """Remove markdown formatting and extract pure Python code."""
    code = code.strip()
    
    # Remove ```python or ``` blocks
    if "```" in code:
        # Try to extract code between backticks
        pattern = r"```(?:python|Python|py)?\s*\n?(.*?)```"
        matches = re.findall(pattern, code, re.DOTALL)
        if matches:
            code = max(matches, key=len)  # Get longest code block
        else:
            # Just strip the backticks
            code = re.sub(r"```(?:python|Python|py)?\s*\n?", "", code)
            code = code.replace("```", "")
    
    # Remove stray backticks
    code = code.replace("`", "")
    
    # Remove leading explanation text - find first valid Python line
    lines = code.strip().split('\n')
    start_idx = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if (stripped.startswith('import ') or 
            stripped.startswith('from ') or 
            stripped.startswith('#') or
            stripped.startswith('df_') or
            stripped.startswith('result_') or
            stripped.startswith('print(') or
            stripped == '' or
            re.match(r'^[a-zA-Z_]\w*\s*=', stripped)):
            start_idx = i
            break
    
    code = '\n'.join(lines[start_idx:])
    return code.strip()


def fix_code(original_code: str, error: str, task: str, use_thinking_llm: bool = False) -> str:
    """Generate fixed code after an error. Escalates to thinking LLM if needed."""
    # Truncate error for cleaner prompt
    error_clean = error[:1000] if len(error) > 1000 else error
    
    llm_type = "THINKING" if use_thinking_llm else "FAST"
    logger.info(f"🔧 Fixing code with {llm_type} LLM. Error: {error_clean[:100]}...")
    
    prompt = f"""The following Python code failed with an error. Fix it.

ORIGINAL CODE:
```python
{original_code}
```

ERROR MESSAGE:
{error_clean}

ORIGINAL TASK: {task}

COMMON FIXES:
1. Column name typos - Use EXACT column names from the dataset (check case sensitivity!)
2. Data type issues - Use pd.to_numeric(col, errors='coerce') for conversions
3. Missing handling for NaN/None - Use .fillna(0) or .dropna() before .tolist()
4. Index errors - Check length before accessing
5. KeyError - Verify column exists: if 'col' in df.columns
6. AttributeError on 'float' - Value is already a scalar, don't call .tolist()
7. For scalar values, just use the value directly, not .tolist()

CRITICAL RULES:
- Output ONLY valid Python code
- NO markdown backticks
- NO explanations before or after
- Start directly with import or code
- Make sure all values in chart datasets are lists of numbers, not scalars"""

    if use_thinking_llm:
        code = llm_think([{"role": "user", "content": prompt}], system=CODE_GEN_SYSTEM, temp=0.2)
    else:
        code = llm_fast([{"role": "user", "content": prompt}], system=CODE_GEN_SYSTEM, temp=0.2)
    
    code = clean_code_output(code)
    logger.debug(f"Fixed code ({len(code)} chars):\n{code[:300]}...")
    return code


# ══════════════════════════════════════════════════════════════════════════════
# NARRATION AGENT - Converts results to natural language
# ══════════════════════════════════════════════════════════════════════════════

NARRATOR_SYSTEM = """You are a business analyst providing insights. Convert data analysis results into clear, actionable insights.

RULES:
1. Be concise - 2-4 sentences max
2. Highlight the key finding
3. Provide business context
4. Suggest implications or actions if relevant
5. Use specific numbers from the results
6. DO NOT mention code, dataframes, or technical details
7. DO NOT show any Python code
8. Speak as if you performed the analysis yourself"""


def narrate_results(query: str, results: Dict, logs: str) -> str:
    """Convert execution results to natural language."""
    prompt = f"""USER ASKED: {query}

ANALYSIS RESULTS:
- Chart Data: {json.dumps(results.get('chart_data'), default=str) if results.get('chart_data') else 'None'}
- Metrics: {json.dumps(results.get('metrics'), default=str) if results.get('metrics') else 'None'}
- Computation Logs: {logs[:500] if logs else 'None'}

Provide a clear, business-focused response. Do not mention any code or technical details."""

    return llm_fast([{"role": "user", "content": prompt}], system=NARRATOR_SYSTEM, temp=0.7)


# ══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR - Main reasoning loop
# ══════════════════════════════════════════════════════════════════════════════

class AgentOrchestrator:
    """Main agent orchestrator implementing ReAct-style reasoning."""
    
    def __init__(self):
        self.registry = get_registry()
        self.max_retries = 5  # Increased retries with escalation to thinking LLM
    
    def process(self, query: str, history: List[Dict] = None) -> Dict:
        """Process a user query through the full agent pipeline."""
        logger.info(f"🤖 Processing query: {query[:80]}...")
        
        context = self.registry.get_context_for_llm()
        
        # Step 1: Plan
        plan = plan_query(query, context)
        
        # Step 2: Route based on intent
        if not plan.get("requires_code", False) and plan.get("intent") == "ANSWER":
            logger.info("📝 Routing to direct answer (no code needed)")
            return self._direct_answer(query, context, history)
        
        # Step 3: Execute code for analysis/plot
        logger.info(f"⚙️ Routing to code execution (intent: {plan.get('intent')})")
        return self._execute_analysis(query, plan, history)
    
    def _direct_answer(self, query: str, context: str, history: List[Dict]) -> Dict:
        """Answer directly without code execution."""
        logger.debug("Generating direct answer from LLM")
        system = f"""You are a data analyst assistant. Answer questions based on available data.

{context}

Be concise and specific. Use numbers when available. Do not mention any code."""
        
        msgs = (history or []) + [{"role": "user", "content": query}]
        response = llm_fast(msgs[-10:], system=system, temp=0.7)
        logger.info(f"Direct answer: {len(response)} chars")
        
        return {
            "response": response,
            "artifacts": [],
            "suggestions": self._get_suggestions(query)
        }
    
    def _execute_analysis(self, query: str, plan: Dict, history: List[Dict]) -> Dict:
        """Execute code-based analysis with retry loop."""
        logger.info("Starting code-based analysis")
        
        # Get dataset paths
        datasets_needed = plan.get("datasets_needed", [])
        dataset_paths = []
        dataset_infos = []
        
        if not datasets_needed:
            # Use first available dataset
            logger.debug("No specific datasets requested, using first available")
            for name, ds in list(self.registry.datasets.items())[:1]:
                dataset_paths.append(ds["path"])
                dataset_infos.append(ds)
        else:
            for name in datasets_needed:
                path = self.registry.get_dataset_path(name)
                if path:
                    dataset_paths.append(path)
                    for ds_name, ds in self.registry.datasets.items():
                        if ds["path"] == path:
                            dataset_infos.append(ds)
                            break
        
        if not dataset_paths:
            logger.warning("No dataset paths found")
            return {
                "response": "I couldn't find the required datasets. Please check available data.",
                "artifacts": [],
                "suggestions": []
            }
        
        logger.info(f"Using {len(dataset_paths)} datasets: {[Path(p).stem for p in dataset_paths]}")
        
        # Generate and execute code with retry
        task = f"{query}\n\nPlan: {json.dumps(plan)}"
        code = generate_code(task, dataset_infos, plan)
        last_error = ""
        
        for attempt in range(self.max_retries):
            # Use thinking LLM for later attempts
            use_thinking = attempt >= 2
            llm_type = "THINKING" if use_thinking else "FAST"
            logger.info(f"🔄 Attempt {attempt + 1}/{self.max_retries} (using {llm_type} LLM)...")
            
            result = execute_code(code, dataset_paths)
            
            if result["success"]:
                output = result.get("output", {})
                logs = result.get("logs", "")
                
                # Narrate results
                logger.info("📝 Generating narration...")
                narration = narrate_results(query, output, logs)
                
                # Build artifacts
                artifacts = []
                if output.get("chart_data"):
                    artifacts.append({
                        "type": "chart",
                        "data": output["chart_data"]
                    })
                if output.get("table"):
                    artifacts.append({
                        "type": "table",
                        "data": output["table"]
                    })
                if output.get("metrics"):
                    artifacts.append({
                        "type": "metrics",
                        "data": output["metrics"]
                    })
                
                logger.info(f"✅ Analysis complete: {len(artifacts)} artifacts")
                return {
                    "response": narration,
                    "artifacts": artifacts,
                    "suggestions": self._get_suggestions(query)
                }
            
            # Failed - try to fix
            last_error = result.get("error", "Unknown error")
            if attempt < self.max_retries - 1:
                # Escalate to thinking LLM on attempt 3+ (0-indexed: attempt >= 2)
                use_thinking_for_fix = attempt >= 2
                logger.warning(f"Attempt {attempt + 1} failed. Error: {last_error[:150]}...")
                logger.info(f"Generating fix with {'THINKING' if use_thinking_for_fix else 'FAST'} LLM...")
                code = fix_code(code, last_error, task, use_thinking_llm=use_thinking_for_fix)
        
        # All retries failed
        logger.error(f"All {self.max_retries} attempts failed")
        return {
            "response": f"I encountered difficulties analyzing this. The analysis was complex and failed after {self.max_retries} attempts. Could you rephrase or simplify your question?",
            "artifacts": [],
            "suggestions": ["Show me monthly trends", "What's the publish rate?", "Compare top channels"]
        }
    
    def _get_suggestions(self, query: str) -> List[str]:
        """Generate contextual suggestions."""
        q = query.lower()
        if "channel" in q:
            return ["Which channels have 0% publish rate?", "Channel efficiency comparison", "Top 5 channels by volume"]
        elif "user" in q:
            return ["Most active users", "User publish rate distribution", "New vs returning users"]
        elif "trend" in q or "month" in q:
            return ["Compare H1 vs H2", "Best performing month", "Growth rate analysis"]
        elif "publish" in q:
            return ["Why is publish rate low?", "Publish rate by channel", "Published vs processed ratio"]
        else:
            return ["Show monthly trends", "Top performing channels", "User activity analysis"]


# Global orchestrator
_orchestrator: Optional[AgentOrchestrator] = None

def get_orchestrator() -> AgentOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator()
    return _orchestrator


# ══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

sessions: Dict[str, Dict[str, Any]] = {}


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    artifacts: List[Dict[str, Any]] = []
    suggestions: List[str] = []


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "frammer-agent"}


@app.on_event("startup")
async def startup():
    """Initialize on server start."""
    logger.info("🚀 Starting Frammer Agent Server...")
    get_registry()  # Load datasets
    get_orchestrator()  # Initialize orchestrator
    logger.info("✅ Server ready!")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint - routes through full agent pipeline."""
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"📨 Chat request: '{request.message[:80]}...' (session: {session_id[:8]})")
    
    if session_id not in sessions:
        sessions[session_id] = {"history": []}
    
    try:
        orchestrator = get_orchestrator()
        result = orchestrator.process(
            request.message,
            sessions[session_id]["history"]
        )
        
        logger.info(f"✅ Response: {len(result.get('response', ''))} chars, {len(result.get('artifacts', []))} artifacts")
        
        # Update history
        sessions[session_id]["history"].append({"role": "user", "content": request.message})
        sessions[session_id]["history"].append({"role": "assistant", "content": result["response"]})
        
        # Keep bounded
        if len(sessions[session_id]["history"]) > 20:
            sessions[session_id]["history"] = sessions[session_id]["history"][-20:]
        
        return ChatResponse(
            response=result["response"],
            session_id=session_id,
            artifacts=result.get("artifacts", []),
            suggestions=result.get("suggestions", [])
        )
        
    except Exception as e:
        logger.exception(f"❌ Chat error: {e}")
        return ChatResponse(
            response=f"I encountered an error: {str(e)}. Please try again.",
            session_id=session_id,
            artifacts=[],
            suggestions=[]
        )


@app.get("/datasets")
async def list_datasets():
    """List all available datasets."""
    registry = get_registry()
    return {
        "datasets": [
            {
                "id": i,
                "name": name,
                "rows": ds["rows"],
                "columns": len(ds["columns"]),
                "column_names": ds["columns"]
            }
            for i, (name, ds) in enumerate(registry.datasets.items())
        ]
    }


@app.get("/datasets/{name}/preview")
async def preview_dataset(name: str, limit: int = 100):
    """Preview a dataset."""
    registry = get_registry()
    path = registry.get_dataset_path(name)
    if not path:
        raise HTTPException(404, "Dataset not found")
    
    df = pd.read_csv(path, encoding="utf-8-sig", nrows=limit)
    return {
        "name": name,
        "columns": list(df.columns),
        "data": df.to_dict(orient="records"),
        "total_rows": len(df)
    }


@app.get("/datasets/{dataset_id}/sample")
async def sample_dataset(dataset_id: int, limit: int = 20):
    """Get sample rows from a dataset by ID (for Data Explorer)."""
    registry = get_registry()
    datasets = list(registry.datasets.items())
    
    if dataset_id >= len(datasets):
        raise HTTPException(404, "Dataset not found")
    
    name, ds = datasets[dataset_id]
    df = pd.read_csv(ds["path"], encoding="utf-8-sig", nrows=limit)
    
    return {
        "columns": list(df.columns),
        "data": df.to_dict(orient="records"),
        "total_rows": ds["rows"]
    }


@app.get("/kpis")
async def get_kpis():
    """Get computed KPIs."""
    registry = get_registry()
    return {"kpis": registry.kpis}


@app.get("/schema")
async def get_schema():
    """Get full schema for all datasets."""
    registry = get_registry()
    return {
        "datasets": {
            name: {
                "columns": ds["columns"],
                "schema": ds["schema"],
                "rows": ds["rows"]
            }
            for name, ds in registry.datasets.items()
        }
    }


if __name__ == "__main__":
    import uvicorn
    print(f"📁 Data directory: {DATA_DIR}")
    print(f"🔑 API key set: {'Yes' if GROQ_API_KEY else 'No'}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
