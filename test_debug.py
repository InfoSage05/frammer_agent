"""Debug test to find exact issues with code generation and execution."""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

print("=" * 60)
print("DEBUG TEST - Finding exact issues")
print("=" * 60)

# Test 1: Registry
print("\n[1] Testing Registry...")
from dataset_registry import DatasetRegistry
registry = DatasetRegistry()
print(f"  Datasets: {list(registry.datasets.keys())[:3]}...")

# Test 2: Get dataset info
print("\n[2] Testing get_dataset_details...")
details = registry.get_dataset_details('monthly-chart')
print(f"  Columns: {details['columns']}")
print(f"  Sample: {details['sample_rows'][0]}")

# Test 3: Test simple code execution
print("\n[3] Testing simple code execution...")
from code_agent.executor import execute_code

simple_code = """
import json
result = {"answer": 42, "message": "Hello"}
print(json.dumps(result))
"""
success, output = execute_code(simple_code)
print(f"  Success: {success}")
print(f"  Output: {output[:100] if output else 'None'}")

# Test 4: Test code with dataset
print("\n[4] Testing code with dataset loading...")
dataset_code = f"""
import pandas as pd
import json

# Load dataset directly
df = pd.read_csv(r'{registry.datasets['monthly-chart']['path']}')
print("Columns:", df.columns.tolist())
print("Shape:", df.shape)

result = {{
    "columns": df.columns.tolist(),
    "rows": len(df)
}}
print(json.dumps(result))
"""
success, output = execute_code(dataset_code)
print(f"  Success: {success}")
print(f"  Output: {output[:200] if output else 'None'}")

# Test 5: Test LLM code generation
print("\n[5] Testing LLM code generation...")
from code_agent.generator import generate_analysis_code

task = "Calculate the average of Total Published column from monthly-chart dataset"
context = registry.get_context_for_code_gen(['monthly-chart'])
print(f"  Context length: {len(context)} chars")

generated_code = generate_analysis_code(task, context)
print(f"  Generated code length: {len(generated_code)} chars")
print(f"  First 300 chars:\n{generated_code[:300]}")

# Test 6: Execute generated code
print("\n[6] Executing generated code...")
success, output = execute_code(generated_code)
print(f"  Success: {success}")
print(f"  Output: {output[:300] if output else 'None'}")

# Test 7: If failed, test error recovery
if not success:
    print("\n[7] Testing error recovery...")
    from code_agent.generator import generate_fix_code
    
    fixed_code = generate_fix_code(generated_code, output, task, context)
    print(f"  Fixed code length: {len(fixed_code)} chars")
    
    success2, output2 = execute_code(fixed_code)
    print(f"  Success after fix: {success2}")
    print(f"  Output: {output2[:300] if output2 else 'None'}")

print("\n" + "=" * 60)
print("DEBUG COMPLETE")
print("=" * 60)
