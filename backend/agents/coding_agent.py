"""
Coding Agent - Wraps the existing planner for data analysis tasks
"""
import sys
from pathlib import Path

_backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_backend_dir.parent))

from .base import AgentResult


class CodingAgent:
    """Handles data analysis and visualization tasks using the existing planner"""
    
    name = "coding"
    description = "Analyzes data, computes metrics, and creates visualizations"
    
    def execute(
        self,
        task: str,
        context: dict = None,
        previous_results: list = None,
        should_plot: bool = False
    ) -> AgentResult:
        """
        Execute analysis task using the planner
        
        Args:
            task: The analysis task to perform
            context: Session context including conversation history
            previous_results: Results from previous steps (for multi-step tasks)
            should_plot: Whether to create visualization (controlled by master)
        """
        from planner import run_planner
        
        # Build enhanced task with previous results context
        enhanced_task = task
        
        # Add plotting instruction if master decided to plot
        if should_plot:
            enhanced_task += "\n\nIMPORTANT: Create a visualization/chart for this analysis."
        else:
            enhanced_task += "\n\nNOTE: Do not create charts, just compute and return the data/summary."
        
        # Add previous results if this is a dependent step
        if previous_results:
            enhanced_task += "\n\nPrevious step results:\n"
            for i, prev in enumerate(previous_results, 1):
                if prev.get("data"):
                    data_summary = str(prev["data"])[:500]
                    enhanced_task += f"Step {i}: {data_summary}\n"
                if prev.get("response"):
                    enhanced_task += f"Step {i} summary: {prev['response'][:200]}\n"
        
        # Get conversation context
        conversation_context = ""
        if context:
            conversation_context = context.get("conversation_context", "")
        
        # Run the existing planner
        result = run_planner(enhanced_task, conversation_context=conversation_context)
        
        # Filter artifacts based on should_plot
        artifacts = result.get("artifacts", [])
        if not should_plot:
            artifacts = [a for a in artifacts if a.get("type") != "chart"]
        
        return AgentResult(
            success=True if result.get("answer") else False,
            response=result.get("answer", "Analysis failed"),
            artifacts=artifacts,
            data=result.get("data"),
            datasets_used=result.get("datasets_used", []),
            error=result.get("error")
        )
