"""
Test script for code executor
Run from: frammer_agent/ folder
Command: python test_executor.py
"""
import os
import sys
from pathlib import Path

# Setup paths - add backend folder
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

# Load env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

print("=" * 60)
print("TESTING CODE EXECUTOR")
print("=" * 60)

# Test 1: Initialize registry
print("\n[TEST 1] Initialize Dataset Registry")
print("-" * 40)

from config import DATA_DIR
from dataset_registry import initialize_registry, get_registry

registry = initialize_registry(DATA_DIR)
print(f"Loaded {len(registry.datasets)} datasets")
for name in list(registry.datasets.keys())[:5]:
    print(f"  - {name}")

# Test 2: Test code execution directly
print("\n[TEST 2] Test Code Execution")
print("-" * 40)

from code_agent.executor import execute_code_with_retry

test_code = """
# Simple test - load a dataset and create chart data
df = load_dataset('monthly-chart')
print(f"Loaded {len(df)} rows")

# Get columns
cols = df.columns.tolist()
print(f"Columns: {cols}")

# Create simple chart data
chart_data = df.head(5).to_dict('records')
chart = create_chart('line', 'Test Chart', chart_data, cols[0], cols[1:])

RESULT['charts'].append(chart)
RESULT['summary'] = f"Loaded dataset with {len(df)} rows and {len(cols)} columns"
print(json.dumps(RESULT))
"""

result = execute_code_with_retry(test_code, "Test basic execution")
print(f"\nSuccess: {result['success']}")
if result['success']:
    print(f"Result type: {type(result['result'])}")
    if isinstance(result['result'], dict):
        print(f"Charts: {len(result['result'].get('charts', []))}")
        print(f"Summary: {result['result'].get('summary', 'N/A')}")
else:
    print(f"Error: {result['error']}")

# Test 3: Test with error recovery - use actual task description so LLM knows what to fix
print("\n[TEST 3] Test Error Recovery")
print("-" * 40)

bad_code = """
# Code with wrong column name
df = load_dataset('monthly-chart')
# Wrong column name - should be 'Total Published' not 'Published'
result = df['Published'].sum()
RESULT['summary'] = f"Total published videos: {result}"
print(json.dumps(RESULT))
"""

# Give descriptive task so LLM knows what we're trying to do
result = execute_code_with_retry(
    bad_code, 
    "Calculate the sum of Total Published from monthly-chart dataset"
)
print(f"\nSuccess: {result['success']}")
if result['success']:
    print(f"Result: {result['result']}")
else:
    print(f"Error: {result['error'][:200]}")

# Test 4: Test tool execution
print("\n[TEST 4] Test Tool Execution")
print("-" * 40)

from agent_tools import execute_tool

# Test list_datasets
print("\n> list_datasets:")
result = execute_tool("list_datasets")
print(result[:500])

# Test get_dataset_details
print("\n> get_dataset_details('monthly-chart'):")
result = execute_tool("get_dataset_details", dataset_name="monthly-chart")
print(result[:500])

# Test search_columns
print("\n> search_columns('publish'):")
result = execute_tool("search_columns", query="publish")
print(result)

print("\n" + "=" * 60)
print("TESTS COMPLETE")
print("=" * 60)
