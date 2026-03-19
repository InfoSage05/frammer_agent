"""
Factory System - Create agents, tools, and other components

Provides factory patterns to decouple component creation from usage.
Enables easy substitution and testing of components.
"""
import logging
from typing import Dict, Type, Any, Optional, List, Protocol
from abc import ABC, abstractmethod
from enum import Enum

from .extension_system import ServiceRegistry, PluginRegistry, ExtensionType

logger = logging.getLogger("frammer.factory")


# ─── Agent Factory ──────────────────────────────────────────────────────────

class AgentFactory:
    """
    Factory for creating agent instances.
    Manages agent registration and instantiation.
    """
    
    _instance = None
    _agent_classes: Dict[str, Type] = {}
    _agent_configs: Dict[str, Dict[str, Any]] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def register_agent(self, agent_type: str, agent_class: Type, config: Dict[str, Any] = None):
        """
        Register an agent class.
        
        Args:
            agent_type: Identifier for the agent type
            agent_class: The agent class to register
            config: Optional default configuration for this agent type
        """
        self._agent_classes[agent_type] = agent_class
        if config:
            self._agent_configs[agent_type] = config
        logger.debug(f"Registered agent type: {agent_type}")
    
    def create_agent(self, agent_type: str, **kwargs) -> Any:
        """
        Create an agent instance.
        
        Args:
            agent_type: Type of agent to create
            **kwargs: Additional arguments to pass to agent constructor
            
        Returns:
            Agent instance
            
        Raises:
            ValueError: If agent type is not registered
        """
        if agent_type not in self._agent_classes:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        agent_class = self._agent_classes[agent_type]
        
        # Merge default config with provided kwargs
        config = self._agent_configs.get(agent_type, {}).copy()
        config.update(kwargs)
        
        try:
            agent = agent_class(**config)
            logger.info(f"Created agent instance: {agent_type}")
            return agent
        except Exception as e:
            logger.error(f"Failed to create agent {agent_type}: {e}")
            raise
    
    def list_agent_types(self) -> List[str]:
        """List all registered agent types"""
        return list(self._agent_classes.keys())
    
    def get_agent_config(self, agent_type: str) -> Dict[str, Any]:
        """Get configuration for an agent type"""
        return self._agent_configs.get(agent_type, {})
    
    def update_agent_config(self, agent_type: str, config: Dict[str, Any]):
        """Update configuration for an agent type"""
        if agent_type not in self._agent_classes:
            raise ValueError(f"Unknown agent type: {agent_type}")
        self._agent_configs[agent_type] = config


# ─── Tool Factory ───────────────────────────────────────────────────────────

class ToolFactory:
    """
    Factory for creating tools.
    """
    
    _instance = None
    _tool_classes: Dict[str, Type] = {}
    _tool_configs: Dict[str, Dict[str, Any]] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def register_tool(self, tool_type: str, tool_class: Type, config: Dict[str, Any] = None):
        """Register a tool class"""
        self._tool_classes[tool_type] = tool_class
        if config:
            self._tool_configs[tool_type] = config
        logger.debug(f"Registered tool type: {tool_type}")
    
    def create_tool(self, tool_type: str, **kwargs) -> Any:
        """Create a tool instance"""
        if tool_type not in self._tool_classes:
            raise ValueError(f"Unknown tool type: {tool_type}")
        
        tool_class = self._tool_classes[tool_type]
        config = self._tool_configs.get(tool_type, {}).copy()
        config.update(kwargs)
        
        try:
            tool = tool_class(**config)
            logger.info(f"Created tool instance: {tool_type}")
            return tool
        except Exception as e:
            logger.error(f"Failed to create tool {tool_type}: {e}")
            raise
    
    def list_tool_types(self) -> List[str]:
        """List all registered tool types"""
        return list(self._tool_classes.keys())


# ─── Component Factory ──────────────────────────────────────────────────────

class ComponentFactory:
    """
    Generic factory for any component type.
    Supports creating components by extension type.
    """
    
    _instance = None
    _component_classes: Dict[str, Dict[str, Type]] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def register_component(self, category: str, component_type: str, component_class: Type):
        """
        Register a component.
        
        Args:
            category: Component category (e.g., "processor", "handler")
            component_type: Specific component type within category
            component_class: The component class
        """
        if category not in self._component_classes:
            self._component_classes[category] = {}
        
        self._component_classes[category][component_type] = component_class
        logger.debug(f"Registered component: {category}/{component_type}")
    
    def create_component(self, category: str, component_type: str, **kwargs) -> Any:
        """Create a component instance"""
        if category not in self._component_classes:
            raise ValueError(f"Unknown component category: {category}")
        
        if component_type not in self._component_classes[category]:
            raise ValueError(f"Unknown component type: {component_type} in {category}")
        
        component_class = self._component_classes[category][component_type]
        
        try:
            component = component_class(**kwargs)
            logger.info(f"Created component: {category}/{component_type}")
            return component
        except Exception as e:
            logger.error(f"Failed to create component {category}/{component_type}: {e}")
            raise
    
    def list_components(self, category: str = None) -> Dict[str, List[str]]:
        """List available components"""
        if category:
            return {category: list(self._component_classes.get(category, {}).keys())}
        return {k: list(v.keys()) for k, v in self._component_classes.items()}


# ─── Convenience Functions ──────────────────────────────────────────────────

def get_agent_factory() -> AgentFactory:
    """Get the global agent factory"""
    return AgentFactory.get_instance()


def get_tool_factory() -> ToolFactory:
    """Get the global tool factory"""
    return ToolFactory.get_instance()


def get_component_factory() -> ComponentFactory:
    """Get the global component factory"""
    return ComponentFactory.get_instance()


def register_agent_class(agent_type: str, agent_class: Type, config: Dict[str, Any] = None):
    """Convenience function to register an agent"""
    get_agent_factory().register_agent(agent_type, agent_class, config)


def create_agent(agent_type: str, **kwargs) -> Any:
    """Convenience function to create an agent"""
    return get_agent_factory().create_agent(agent_type, **kwargs)


def register_tool_class(tool_type: str, tool_class: Type, config: Dict[str, Any] = None):
    """Convenience function to register a tool"""
    get_tool_factory().register_tool(tool_type, tool_class, config)


def create_tool(tool_type: str, **kwargs) -> Any:
    """Convenience function to create a tool"""
    return get_tool_factory().create_tool(tool_type, **kwargs)
