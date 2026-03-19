"""
Base Agent Protocol and Result Types
"""
from typing import Protocol, Any, Optional
from dataclasses import dataclass, field


@dataclass
class AgentResult:
    """Result returned by any agent"""
    success: bool
    response: str
    artifacts: list = field(default_factory=list)
    data: Any = None
    error: Optional[str] = None
    datasets_used: list = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "response": self.response,
            "artifacts": self.artifacts,
            "data": self.data,
            "error": self.error,
            "datasets_used": self.datasets_used
        }


class BaseAgent(Protocol):
    """Protocol that all agents must implement"""
    name: str
    description: str
    
    def execute(
        self,
        task: str,
        context: dict = None,
        previous_results: list = None
    ) -> AgentResult:
        """
        Execute the agent's task
        
        Args:
            task: The specific task/query to handle
            context: Conversation context and session info
            previous_results: Results from previous TODO steps
        
        Returns:
            AgentResult with response and any artifacts
        """
        ...
