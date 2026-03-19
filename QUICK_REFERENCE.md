"""
Quick Reference Card - Frammer Extensibility Framework

Keep this handy for common tasks!
"""

# ============================================================================
# INITIALIZATION
# ============================================================================

# Initialize the framework
from backend.core import initialize_app, Environment
initialize_app(environment=Environment.DEVELOPMENT)

# Custom initialization with callbacks
from backend.core import create_bootstrap_builder, BootstrapPhase
builder = create_bootstrap_builder()
builder.with_environment(Environment.PRODUCTION)
builder.on_phase(BootstrapPhase.AGENTS, register_my_agents)
builder.build()


# ============================================================================
# SERVICES & DEPENDENCY INJECTION
# ============================================================================

# Register a service
from backend.core import register_service, get_service
register_service("db", Database(), singleton=True)
db = get_service("db")

# Check if service exists
from backend.core import get_service_registry
registry = get_service_registry()
if registry.has_service("db"):
    db = get_service("db")

# List all registered services
registry.list_services()


# ============================================================================
# CONFIGURATION
# ============================================================================

# Get entire config
from backend.core import get_config
config = get_config()
port = config.server.port
debug = config.server.debug

# Get single value with default
from backend.core import get_config_value
timeout = get_config_value("execution.timeout", default=90)

# Set value at runtime
from backend.core import set_config_value
set_config_value("server.debug", True)

# Load environment-specific config
from backend.core import get_config_manager, Environment
manager = get_config_manager()
manager.load_environment_profile(Environment.PRODUCTION)


# ============================================================================
# AGENTS
# ============================================================================

# Register agent class
from backend.core import register_agent_class, create_agent
register_agent_class("my_agent", MyAgent, config={"param": "value"})

# Create agent instance
agent = create_agent("my_agent")
agent2 = create_agent("my_agent", param="override")

# List available agents
from backend.core import get_agent_factory
factory = get_agent_factory()
agent_types = factory.list_agent_types()


# ============================================================================
# TOOLS
# ============================================================================

# Register tool
from backend.core import register_tool_class, create_tool
register_tool_class("my_tool", MyTool)

# Create tool instance
tool = create_tool("my_tool")

# List available tools
from backend.core import get_tool_factory
factory = get_tool_factory()
tool_types = factory.list_tool_types()


# ============================================================================
# PLUGINS
# ============================================================================

# Add plugin search path
from backend.core import register_extension_path
from pathlib import Path
register_extension_path(Path("backend/plugins"))

# Get plugin registry
from backend.core import get_plugin_registry
registry = get_plugin_registry()

# List registered plugins
plugins = registry.list_plugins()

# Get specific plugin
plugin = registry.get_plugin("my_plugin")


# ============================================================================
# CREATING A SIMPLE PLUGIN
# ============================================================================

"""
Create file: backend/plugins/my_plugin/plugin.py
"""

from backend.core import Extension, ExtensionType, ServiceRegistry

class MyPlugin(Extension):
    @property
    def name(self) -> str:
        return "my_plugin"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def extension_type(self) -> ExtensionType:
        return ExtensionType.AGENT
    
    def validate(self) -> bool:
        return True
    
    def initialize(self, registry: ServiceRegistry) -> None:
        from .agent import MyAgent
        registry.register_service("my_agent", MyAgent(), singleton=True)

PLUGIN = MyPlugin()


# ============================================================================
# TESTING WITH DEPENDENCY INJECTION
# ============================================================================

import pytest
from backend.core import get_service_registry

@pytest.fixture
def clean_registry():
    registry = get_service_registry()
    registry.clear()
    yield registry
    registry.clear()

def test_something(clean_registry):
    # Register mocks
    mock_db = MockDatabase()
    clean_registry.register_service("database", mock_db, singleton=True)
    
    # Test code
    my_service = MyService()
    result = my_service.do_something()
    assert result is not None


# ============================================================================
# CONFIGURATION FILE EXAMPLES
# ============================================================================

"""
File: backend/core/config/base.yaml
(Default configuration)
"""
server:
  host: 0.0.0.0
  port: 8000
  debug: false

llm:
  fast_model: llama-3.1-8b-instant
  think_model: llama-3.3-70b-versatile


"""
File: backend/core/config/development.yaml
(Development overrides)
"""
server:
  debug: true
  reload: true

logging:
  level: DEBUG


"""
File: backend/core/config/local.yaml
(Local machine - NOT COMMITTED)
"""
llm:
  api_key: "your-api-key"


# ============================================================================
# ENVIRONMENT VARIABLES
# ============================================================================

# Override configuration via environment variables:
# FRAMMER_ENV=production
# FRAMMER_DEBUG=false
# FRAMMER_PORT=5000
# GROQ_API_KEY=your_key

# In code:
import os
env = os.getenv("FRAMMER_ENV", "development")

# Or let config manager handle it:
from backend.core import get_config_value
env = get_config_value("environment", default="development")


# ============================================================================
# LOOSE COUPLING PATTERNS
# ============================================================================

# BAD: Direct import (tight coupling)
from backend.database import Database
from backend.cache import Cache

class MyService:
    def __init__(self):
        self.db = Database()
        self.cache = Cache()


# GOOD: Service injection (loose coupling)
from backend.core import get_service

class MyService:
    def __init__(self):
        self.db = get_service("database")
        self.cache = get_service("cache")

    def process(self, data):
        # Use injected dependencies
        result = self.db.query(data)
        self.cache.set("result", result)
        return result


# ============================================================================
# PLUGIN DIRECTORY STRUCTURE
# ============================================================================

"""
backend/plugins/
└── my_feature/
    ├── __init__.py
    ├── plugin.py              # Extension class + PLUGIN export
    ├── agent.py               # Agent implementation
    ├── tools.py               # tools
    ├── config.yaml            # Plugin-specific config
    ├── README.md              # Documentation
    └── tests/
        ├── __init__.py
        ├── test_agent.py
        └── test_tools.py
"""


# ============================================================================
# COMMON OPERATIONS
# ============================================================================

# Initialize app on startup
from backend.core import initialize_app, is_app_initialized
if not is_app_initialized():
    initialize_app()

# Get service with fallback
from backend.core import get_service_registry
registry = get_service_registry()
try:
    service = get_service("myservice")
except KeyError:
    service = MyDefaultService()

# Load config from file
from backend.core import get_config_manager
from pathlib import Path
manager = get_config_manager()
manager.load_from_file(Path("custom_config.yaml"))

# Create multiple services
services = {}
for name in ["db", "cache", "logger"]:
    services[name] = get_service(name)

# Register batch of agents
from backend.core import register_agent_class
for agent_name, agent_class in [
    ("agent1", Agent1),
    ("agent2", Agent2),
]:
    register_agent_class(agent_name, agent_class)

# Access nested config
from backend.core import get_config
config = get_config()
timeout = config.execution.timeout
model = config.llm.fast_model

# Override config at runtime
from backend.core import set_config_value
set_config_value("server.port", 9000)
set_config_value("server.debug", True)


# ============================================================================
# DEBUGGING
# ============================================================================

# Check what services are registered
from backend.core import get_service_registry
registry = get_service_registry()
print("Registered services:", registry.list_services())

# Check what agents are available
from backend.core import get_agent_factory
factory = get_agent_factory()
print("Available agents:", factory.list_agent_types())

# Check plugins
from backend.core import get_plugin_registry
registry = get_plugin_registry()
for plugin in registry.list_plugins():
    print(f"Plugin: {plugin.name} v{plugin.version}")

# Check current configuration
from backend.core import get_config
config = get_config()
print(config.to_json())  # Pretty print all settings

# Test service availability
from backend.core import get_service_registry
registry = get_service_registry()
required_services = ["database", "llm_service", "cache"]
for service_name in required_services:
    if registry.has_service(service_name):
        print(f"✓ {service_name} available")
    else:
        print(f"✗ {service_name} MISSING")


# ============================================================================
# MIGRATION CHECKLIST
# ============================================================================

"""
□ Add initialization to main.py
□ Create local.yaml config
□ Register first agent with factory
□ Move one config value from code to YAML
□ Retrieve config using get_config()
□ Register first service
□ Use get_service() to retrieve it
□ Create first plugin
□ Test plugin loads
□ Update documentation
□ Train team on patterns
"""


# ============================================================================
# USEFUL LINKS
# ============================================================================

"""
Documentation:
- EXTENSIBILITY_ARCHITECTURE.md - Overview
- EXTENSIBILITY_GUIDE.md - How to extend
- MIGRATION_GUIDE.md - How to migrate
- BEST_PRACTICES.md - Code patterns
- FOLDER_STRUCTURE.md - Project organization

Examples:
- backend/plugins/data_processor_example.py - Full plugin example
- backend/core/config/base.yaml - Configuration template

Code:
- backend/core/extension_system.py - Service & plugin registries
- backend/core/factory.py - Factory patterns
- backend/core/config_manager.py - Configuration system
- backend/core/bootstrap.py - Application initialization
"""


print(__doc__)
