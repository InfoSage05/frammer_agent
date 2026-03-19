"""
Test script for Frammer Agent backend.
Run this to verify the server starts correctly.
"""
import sys
import os
from pathlib import Path

# Add paths for imports
_agent_dir = Path(__file__).parent
_project_dir = _agent_dir.parent
sys.path.insert(0, str(_project_dir))
sys.path.insert(0, str(_agent_dir))
sys.path.insert(0, str(_agent_dir / "backend"))
sys.path.insert(0, str(_agent_dir / "llm"))
sys.path.insert(0, str(_agent_dir / "tools"))

os.chdir(str(_project_dir))

# Load environment
from dotenv import load_dotenv
load_dotenv(_agent_dir / ".env")

print("Testing imports...")
print(f"Agent dir: {_agent_dir}")
print(f"Project dir: {_project_dir}")

try:
    DATA_DIR = os.getenv("FRAMMER_DATA_DIR", str(_project_dir))
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    print(f"✅ Config loaded")
    print(f"   Data dir: {DATA_DIR}")
    print(f"   API key set: {'Yes' if GROQ_API_KEY else 'No'}")
except Exception as e:
    print(f"❌ Config error: {e}")

try:
    from groq_client import fast_complete, FAST_MODEL
    print(f"✅ LLM module loaded (model: {FAST_MODEL})")
except Exception as e:
    print(f"❌ LLM error: {e}")

try:
    from context_manager import get_registry
    registry = get_registry()
    print(f"✅ Registry loaded")
except Exception as e:
    print(f"❌ Registry error: {e}")

try:
    from orchestrator import run_agent
    print(f"✅ Orchestrator loaded")
except Exception as e:
    print(f"❌ Orchestrator error: {e}")

try:
    from chart_renderer import list_existing_charts
    charts = list_existing_charts()
    print(f"✅ Tools loaded ({len(charts)} charts found)")
except Exception as e:
    print(f"❌ Tools error: {e}")

print("\n--- Testing LLM ---")
try:
    from groq_client import fast_complete
    response = fast_complete(
        [{"role": "user", "content": "Say hello in 5 words or less"}],
        system_prompt="You are a helpful assistant."
    )
    print(f"✅ LLM response: {response[:100]}...")
except Exception as e:
    print(f"❌ LLM test failed: {e}")

print("\nDone! If all checks passed, run the server with:")
print("  cd frammer_agent/backend")
print("  python main.py")
