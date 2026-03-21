"""
Quick test to verify the new ReAct orchestrator works
"""
import sys
from pathlib import Path

# Add project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from gc26.backend.orchestrator.graph_new import run_agent

async def test():
    print("Testing ReAct orchestrator...")
    
    result = await run_agent(
        query="What datasets are available?",
        session_id="test-123"
    )
    
    print("\nResponse:", result.get("response"))
    print("\nArtifacts:", len(result.get("artifacts", [])))
    print("\nSuggestions:", result.get("suggestions"))

if __name__ == "__main__":
    asyncio.run(test())
