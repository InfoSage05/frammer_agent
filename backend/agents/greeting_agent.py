"""
Greeting Agent - Handles simple responses that don't need data analysis
"""
import sys
from pathlib import Path

_backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_backend_dir.parent))

from llm.groq_client import fast_complete
from dbms import list_datasets
from .base import AgentResult


class GreetingAgent:
    """Handles greetings, help queries, and general chat"""
    
    name = "greeting"
    description = "Handles greetings, help queries, and general conversation"
    
    def execute(
        self,
        task: str,
        context: dict = None,
        previous_results: list = None
    ) -> AgentResult:
        """Generate a friendly response"""
        
        datasets = list_datasets()
        dataset_names = [d["name"] for d in datasets[:5]]
        
        prompt = f"""You are a friendly data analysis assistant for Frammer AI (a media publishing platform).

User message: "{task}"

Conversation context: {context.get('conversation_context', 'None') if context else 'None'}

Available datasets: {', '.join(dataset_names) if dataset_names else 'None loaded yet'}

Respond naturally and helpfully. If they're asking what you can do, mention:
- Analyzing publishing data (video counts, publish rates, trends)
- Creating visualizations (charts, comparisons)
- Answering questions about their datasets

Keep response under 100 words, be friendly and concise."""

        response = fast_complete([{"role": "user", "content": prompt}], temperature=0.7)
        
        return AgentResult(
            success=True,
            response=response.strip(),
            artifacts=[],
            data=None
        )
