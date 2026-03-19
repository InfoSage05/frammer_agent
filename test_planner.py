"""
Test the planning agent with DBMS preset functions and code executor
Run: python test_planner.py
"""
import os
import sys
import logging
from pathlib import Path

# Setup paths
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

# Load env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)-10s | %(levelname)-5s | %(message)s',
    datefmt='%H:%M:%S'
)

# Set specific loggers
logging.getLogger("planner").setLevel(logging.INFO)
logging.getLogger("executor").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("groq").setLevel(logging.WARNING)

print("=" * 70)
print("TESTING PLANNER + EXECUTOR")
print("=" * 70)

# Initialize registry
from config import DATA_DIR
from dataset_registry import initialize_registry

print("\n[INIT] Loading datasets...")
registry = initialize_registry(DATA_DIR)
print(f"Loaded {len(registry.datasets)} datasets")

# Test planner
print("\n" + "-" * 70)
print("[TEST] Planner")
print("-" * 70)

from planner import run_planner

test_cases = [
    # ("Greeting", "Hello, what can you do?"),
    # ("List data", "What datasets do you have?"),
    # ("Simple query", "How many rows in the monthly-chart dataset?"),
    # ("Chart", "Create a chart comparing Facebook vs Instagram publishing by channel"),
    ("Complex", "Show me the top 5 users by video count with their channel breakdown"),
]

for name, query in test_cases:
    print(f"\n{'='*60}")
    print(f"[{name}] {query}")
    print("=" * 60)
    try:
        result = run_planner(query)
        answer = result['answer'][:500] + "..." if len(result['answer']) > 500 else result['answer']
        print(f"\n📝 Answer: {answer}")
        if result.get('artifacts'):
            print(f"📊 Artifacts: {len(result['artifacts'])}")
            for i, art in enumerate(result['artifacts']):
                art_type = art.get('type', '?')
                art_title = art.get('title', 'N/A')
                chart_type = art.get('chartType', '')
                data_len = len(art.get('data', [])) if isinstance(art.get('data'), list) else 0
                print(f"   {i+1}. type={art_type}, chartType={chart_type}, title={art_title}, data_points={data_len}")
                if art.get('xKey'):
                    print(f"      xKey={art.get('xKey')}, yKeys={art.get('yKeys')}")
        else:
            print("📊 No artifacts returned")
        print("✓ OK")
    except Exception as e:
        print(f"✗ ERROR: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "=" * 70)
print("TESTS COMPLETE")
print("=" * 70)
