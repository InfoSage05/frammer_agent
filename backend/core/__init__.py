"""
Frammer Core - Extensibility and Architecture Framework

A comprehensive extensibility system providing:
- Plugin architecture
- Service registry and dependency injection
- Factory patterns for component creation
- Configuration management with profiles
- Application bootstrap and lifecycle management

Quick Start:
    from backend.core import initialize_app, create_agent, get_service
    
    # Initialize the application
    initialize_app()
    
    # Create an agent
    agent = create_agent("my_agent")
    
    # Get a service
    config = get_service("config_manager")
"""

# Extension System
from .extension_system import (
    ServiceRegistry,
    PluginRegistry,
    Extension,
    ExtensionType,
    get_service_registry,
    get_plugin_registry,
    register_service,
    get_service,
    register_extension_path,
    register_agent,
    register_tool,
)

# Factory System
from .factory import (
    AgentFactory,
    ToolFactory,
    ComponentFactory,
    get_agent_factory,
    get_tool_factory,
    get_component_factory,
    create_agent,
    create_tool,
    register_agent_class,
    register_tool_class,
)

# Configuration Management
from .config_manager import (
    ConfigManager,
    ApplicationConfig,
    ServerConfig,
    DatabaseConfig,
    LLMConfig,
    ExecutionConfig,
    ExtensionConfig,
    LoggingConfig,
    Environment,
    get_config_manager,
    get_config,
    get_config_value,
    set_config_value,
)

# Bootstrap
from .bootstrap import (
    BootstrapManager,
    BootstrapBuilder,
    BootstrapPhase,
    initialize_app,
    is_app_initialized,
    get_bootstrap_manager,
    create_bootstrap_builder,
)

__all__ = [
    # Extension System
    "ServiceRegistry",
    "PluginRegistry",
    "Extension",
    "ExtensionType",
    "get_service_registry",
    "get_plugin_registry",
    "register_service",
    "get_service",
    "register_extension_path",
    "register_agent",
    "register_tool",
    # Factory System
    "AgentFactory",
    "ToolFactory",
    "ComponentFactory",
    "get_agent_factory",
    "get_tool_factory",
    "get_component_factory",
    "create_agent",
    "create_tool",
    "register_agent_class",
    "register_tool_class",
    # Configuration
    "ConfigManager",
    "ApplicationConfig",
    "ServerConfig",
    "DatabaseConfig",
    "LLMConfig",
    "ExecutionConfig",
    "ExtensionConfig",
    "LoggingConfig",
    "Environment",
    "get_config_manager",
    "get_config",
    "get_config_value",
    "set_config_value",
    # Bootstrap
    "BootstrapManager",
    "BootstrapBuilder",
    "BootstrapPhase",
    "initialize_app",
    "is_app_initialized",
    "get_bootstrap_manager",
    "create_bootstrap_builder",
]
