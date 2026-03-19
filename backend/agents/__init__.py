"""
Agent Registry - Modular agent system for the orchestrator
"""
from typing import Dict
from .base import BaseAgent, AgentResult
from .greeting_agent import GreetingAgent
from .coding_agent import CodingAgent

# Registry of available agents
_AGENTS: Dict[str, BaseAgent] = {}


def register_agent(agent: BaseAgent):
    """Register an agent in the registry"""
    _AGENTS[agent.name] = agent


def get_agent(name: str) -> BaseAgent:
    """Get an agent by name"""
    if name not in _AGENTS:
        raise ValueError(f"Agent '{name}' not found. Available: {list(_AGENTS.keys())}")
    return _AGENTS[name]


def list_agents() -> list:
    """List all registered agents"""
    return [{"name": a.name, "description": a.description} for a in _AGENTS.values()]


# Auto-register agents on import
def _initialize():
    register_agent(GreetingAgent())
    register_agent(CodingAgent())


_initialize()

__all__ = ["get_agent", "list_agents", "register_agent", "BaseAgent", "AgentResult"]
