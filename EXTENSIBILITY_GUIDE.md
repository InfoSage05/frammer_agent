"""
EXTENSIBILITY GUIDE - How to Extend Frammer Agent

This guide explains how to use the extensibility framework to add new features
without modifying core code. It covers plugins, agents, tools, and services.

Table of Contents:
1. Architecture Overview
2. Creating Plugins
3. Creating Agents
4. Creating Tools
5. Creating Services
6. Configuration Management
7. Bootstrap and Initialization
8. Dependency Injection
9. Best Practices
"""

# ============================================================================
# 1. ARCHITECTURE OVERVIEW
# ============================================================================

"""
The extensibility framework consists of:

┌─────────────────────────────────────────────────────────────┐
│                    Application                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Agents     │  │    Tools     │  │  Components      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Service Registry (DI Container)           │  │
│  │  - Manage service instances                          │  │
│  │  - Singleton management                              │  │
│  │  - Dependency resolution                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Plugin Registry & Loader                    │  │
│  │  - Discover plugins from directories                 │  │
│  │  - Load and initialize plugins                       │  │
│  │  - Manage plugin lifecycle                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Factory System                              │  │
│  │  - AgentFactory: Create and manage agents            │  │
│  │  - ToolFactory: Create and manage tools              │  │
│  │  - ComponentFactory: Create other components         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Configuration System                        │  │
│  │  - Environment-based profiles (dev/test/prod)       │  │
│  │  - YAML/JSON configuration files                     │  │
│  │  - Environment variable overrides                    │  │
│  │  - Runtime configuration updates                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
"""

# ============================================================================
# 2. CREATING PLUGINS
# ============================================================================

"""
A plugin is a self-contained module that extends Frammer with new capabilities.
Plugins can register agents, tools, services, and configuration.

Structure:
    my_plugin/
        __init__.py
        plugin.py          # Required: Plugin class definition
        agent.py           # Optional: Agent implementations
        tools.py           # Optional: Tool implementations
        config.yaml        # Optional: Plugin-specific config

Step 1: Create the Plugin Class
"""

# Example: Creating a plugin
# File: backend/plugins/my_plugin/plugin.py

from backend.core import Extension, ExtensionType, ServiceRegistry, register_agent, register_tool

class MyPlugin(Extension):
    """Example plugin that extends Frammer"""
    
    @property
    def name(self) -> str:
        return "my_plugin"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def extension_type(self) -> ExtensionType:
        return ExtensionType.AGENT  # This plugin provides agents
    
    def validate(self) -> bool:
        """Validate plugin integrity"""
        # Check dependencies, validate configuration, etc.
        return True
    
    def initialize(self, registry: ServiceRegistry) -> None:
        """
        Initialize plugin and register services.
        This is called when the plugin is loaded.
        """
        # Import here to avoid circular dependencies
        from .agent import MyAgent
        from .tools import MyTool
        
        # Register your agent
        registry.register_service(
            "my_agent",
            lambda: MyAgent(),
            singleton=False
        )
        
        # Register your tool
        registry.register_service(
            "my_tool",
            MyTool(),
            singleton=True
        )


# Export the plugin for discovery
PLUGIN = MyPlugin()


# Step 2: Create Your Agent
# File: backend/plugins/my_plugin/agent.py

from backend.agents import BaseAgent, AgentResult

class MyAgent:
    """Your custom agent"""
    name = "my_agent"
    description = "Does something useful"
    
    def execute(self, task: str, context: dict = None, previous_results: list = None) -> AgentResult:
        """Execute the agent's task"""
        try:
            result = f"Processed task: {task}"
            return AgentResult(
                success=True,
                response=result,
                artifacts=[],
                data={"task": task}
            )
        except Exception as e:
            return AgentResult(
                success=False,
                response="",
                error=str(e)
            )


# Step 3: Create Your Tools
# File: backend/plugins/my_plugin/tools.py

class MyTool:
    """Your custom tool"""
    name = "my_tool"
    
    def execute(self, **kwargs):
        """Execute the tool"""
        return {"result": "Tool executed"}


# Step 4: Register Plugin Path
# File: backend/main.py (or during bootstrap)

from backend.core import register_extension_path
from pathlib import Path

register_extension_path(Path("backend/plugins"))


# ============================================================================
# 3. CREATING AGENTS WITHOUT PLUGINS
# ============================================================================

"""
You can also register agents directly with the factory without creating
a full plugin system. Useful for simple one-off agents.
"""

from backend.core import register_agent_class, create_agent

class SimpleAgent:
    name = "simple_agent"
    description = "A simple agent"
    
    def execute(self, task: str, context: dict = None, previous_results: list = None):
        return {"result": f"Handled: {task}"}

# Register the agent
register_agent_class("simple_agent", SimpleAgent)

# Later, create an instance
agent = create_agent("simple_agent")


# ============================================================================
# 4. CREATING TOOLS
# ============================================================================

"""
Register tools with the tool factory for easy component creation.
"""

from backend.core import register_tool_class, create_tool

class DataAnalyzerTool:
    def __init__(self, dataset_path: str = None):
        self.dataset_path = dataset_path
    
    def analyze(self, data):
        return {"analysis": "done"}

# Register with configuration
config = {
    "dataset_path": "/data/default_dataset.csv"
}
register_tool_class("data_analyzer", DataAnalyzerTool, config)

# Create instances
tool = create_tool("data_analyzer")  # Uses default config
tool2 = create_tool("data_analyzer", dataset_path="/data/custom.csv")  # Override config


# ============================================================================
# 5. CREATING SERVICES
# ============================================================================

"""
Services are long-lived components registered with the service registry.
Use dependency injection to access services instead of importing directly.
"""

from backend.core import register_service, get_service

# Register a service
class DataCache:
    def __init__(self):
        self.cache = {}
    
    def get(self, key):
        return self.cache.get(key)
    
    def set(self, key, value):
        self.cache[key] = value

register_service("data_cache", DataCache(), singleton=True)

# Later, retrieve it
cache = get_service("data_cache")
cache.set("my_key", "my_value")


# ============================================================================
# 6. CONFIGURATION MANAGEMENT
# ============================================================================

"""
Configuration is now centralized and can be managed per environment.
"""

# Create configuration files:
# backend/core/config/base.yaml
"""
server:
  host: 0.0.0.0
  port: 8000
  debug: false

database:
  sqlite_path: data/registry.db
  
extensions:
  plugin_paths:
    - backend/plugins
  auto_discover: true
  auto_load: true
"""

# backend/core/config/development.yaml
"""
server:
  debug: true
  reload: true

logging:
  level: DEBUG
"""

# backend/core/config/production.yaml
"""
server:
  debug: false
  workers: 4

extensions:
  auto_discover: false
  auto_load: true
"""

# Access configuration
from backend.core import get_config, get_config_value, set_config_value

config = get_config()
debug_enabled = config.server.debug

# Or use dot notation
jwt_secret = get_config_value("server.jwt_secret", default="default-secret")
set_config_value("server.jwt_secret", "new-secret")


# ============================================================================
# 7. BOOTSTRAP AND INITIALIZATION
# ============================================================================

"""
Initialize the application with proper phase management and error handling.
"""

from backend.core import initialize_app, Environment, create_bootstrap_builder, BootstrapPhase

# Simple initialization
initialize_app(environment=Environment.DEVELOPMENT)

# Or, custom initialization with phase callbacks
def register_agents():
    """Callback to register agents during bootstrap"""
    from backend.core import register_agent_class
    from my_agents import MyAgent, AnotherAgent
    register_agent_class("my_agent", MyAgent)
    register_agent_class("another_agent", AnotherAgent)

def register_services():
    """Callback to register services"""
    from backend.core import register_service
    from my_services import Database
    db = Database()
    register_service("database", db, singleton=True)

bootstrap = create_bootstrap_builder()
bootstrap.with_environment(Environment.PRODUCTION)
bootstrap.with_config_file(Path("custom_config.yaml"))
bootstrap.on_phase(BootstrapPhase.AGENTS, register_agents)
bootstrap.on_phase(BootstrapPhase.SERVICES, register_services)
success = bootstrap.build()


# ============================================================================
# 8. DEPENDENCY INJECTION
# ============================================================================

"""
Instead of importing modules directly, use the service registry to resolve
dependencies. This enables loose coupling and easy testing.
"""

# OLD (Tight Coupling)
from backend.database import Database
db = Database()

# NEW (Loose Coupling with DI)
from backend.core import get_service
db = get_service("database")

# In your agent/component
class MyAgent:
    def __init__(self):
        self.db = get_service("database")
        self.cache = get_service("data_cache")
    
    def execute(self, task):
        # Use injected services
        data = self.db.query(task)
        self.cache.set("last_task", task)
        return data


# ============================================================================
# 9. MODULE ORGANIZATION FOR EXTENSIBILITY
# ============================================================================

"""
Recommended folder structure for an extensible project:

backend/
├── core/                    # Core extensibility framework (don't modify)
│   ├── extension_system.py
│   ├── factory.py
│   ├── config_manager.py
│   ├── bootstrap.py
│   ├── config/
│   │   ├── base.yaml
│   │   ├── development.yaml
│   │   ├── production.yaml
│   │   └── local.yaml
│   └── __init__.py
├── plugins/                 # User plugins (extend freely)
│   ├── data_processor/
│   │   ├── plugin.py
│   │   ├── processor.py
│   │   └── __init__.py
│   ├── custom_agent/
│   │   ├── plugin.py
│   │   ├── agent.py
│   │   └── __init__.py
│   └── ...
├── agents/                  # Core agents
│   ├── base.py
│   └── ...
├── tools/                   # Core tools
│   ├── ...
├── services/                # Core services (database, cache, etc.)
│   ├── database.py
│   ├── cache.py
│   └── ...
└── main.py                  # Application entry point
"""


# ============================================================================
# 10. BEST PRACTICES
# ============================================================================

"""
1. USE DEPENDENCY INJECTION
   - Register services with the registry
   - Inject dependencies instead of importing directly
   - Makes code testable and decoupled

2. DEFINE CLEAR INTERFACES
   - Use Protocol or ABC for service contracts
   - Document what services provide and require
   - Version your APIs

3. USE CONFIGURATION FOR RUNTIME SETTINGS
   - Move hardcoded values to config files
   - Support environment-specific configurations
   - Use environment variables for secrets

4. ORGANIZE CODE BY FEATURE, NOT LAYER
   - Group related code (agent + tools + tests) together
   - Makes plugins self-contained and reusable
   - Easier to remove or replace features

5. FAIL GRACEFULLY
   - Validate plugins on registration
   - Handle service unavailability
   - Log errors for debugging

6. TEST WITH DEPENDENCY INJECTION
   - Mock services by registering test versions
   - Use create_bootstrap_builder for test setup
   - Clear registry between tests

7. DOCUMENT EXTENSION POINTS
   - In plugin.py: What services does it provide?
   - In configuration: What parameters are available?
   - In code: What hooks or events are available?

8. VERSION YOUR APIs
   - Use semantic versioning for plugins
   - Document breaking changes
   - Support multiple versions gradually
"""


# ============================================================================
# 11. TESTING EXTENSIONS
# ============================================================================

"""
Example of testing an extension with dependency injection
"""

import pytest
from backend.core import get_service_registry, create_bootstrap_builder, BootstrapPhase

def test_my_agent():
    # Setup
    registry = get_service_registry()
    registry.clear()  # Start fresh
    
    # Register mock dependencies
    mock_db = MockDatabase()
    registry.register_service("database", mock_db, singleton=True)
    
    # Create agent
    from my_plugin import MyAgent
    agent = MyAgent()
    
    # Test
    result = agent.execute("test task")
    assert result.success
    assert mock_db.queries_called > 0


class MockDatabase:
    def __init__(self):
        self.queries_called = 0
    
    def query(self, sql):
        self.queries_called += 1
        return []


# ============================================================================
# QUICK REFERENCE
# ============================================================================

"""
Key Classes and Functions:

Service Registry:
  - register_service(name, service, singleton=False)
  - get_service(name)
  - get_service_registry()

Plugin Registry:
  - register_extension_path(path)
  - get_plugin_registry()

Factories:
  - register_agent_class(type, class, config)
  - create_agent(type, **kwargs)
  - register_tool_class(type, class, config)
  - create_tool(type, **kwargs)

Configuration:
  - get_config()
  - get_config_value(key, default)
  - set_config_value(key, value)

Bootstrap:
  - initialize_app(environment)
  - create_bootstrap_builder()
  - get_bootstrap_manager()
"""

print(__doc__)
