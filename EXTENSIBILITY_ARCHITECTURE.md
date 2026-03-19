# Frammer Extensibility Architecture

A comprehensive, production-ready extensibility framework that enables future development without modifying core code.

## Overview

The extensibility system provides:

✅ **Plugin Architecture** - Dynamically load and manage plugins  
✅ **Service Registry** - Centralized dependency injection  
✅ **Factory Patterns** - Create agents, tools, and components  
✅ **Configuration Management** - Environment-based, profile-driven config  
✅ **Bootstrap System** - Proper initialization with phase management  
✅ **Loose Coupling** - Components don't depend on each other directly  

## Quick Start

### 1. Initialize the Application

```python
from backend.core import initialize_app, Environment

# Initialize with development environment
initialize_app(environment=Environment.DEVELOPMENT)
```

### 2. Create an Agent

```python
from backend.core import create_agent

# Create agent instance
agent = create_agent("my_agent", param1="value1")
```

### 3. Register a Service

```python
from backend.core import register_service, get_service

# Register
class MyService:
    def do_something(self):
        return "done"

register_service("my_service", MyService(), singleton=True)

# Retrieve and use
service = get_service("my_service")
service.do_something()
```

### 4. Get Configuration

```python
from backend.core import get_config, get_config_value

# Get entire config
config = get_config()
debug_mode = config.server.debug

# Or use dot notation
api_port = get_config_value("server.port", default=8000)
```

## Architecture

### Service Registry

Central registry for all services and dependencies.

```python
from backend.core import get_service_registry, register_service

registry = get_service_registry()

# Register a service
registry.register_service("cache", CacheService(), singleton=True)

# After bootstrap, services auto-registered:
# - agent_factory
# - tool_factory  
# - component_factory
# - config_manager
```

### Plugin System

Plugins extend Frammer with new capabilities.

```python
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
        # Register your services here
        registry.register_service("my_agent", MyAgent(), singleton=True)

# Export for auto-discovery
PLUGIN = MyPlugin()
```

### Factory System

Decouple component creation from usage.

```python
from backend.core import (
    register_agent_class, create_agent,
    register_tool_class, create_tool
)

# Register
register_agent_class("custom_agent", CustomAgent, config={})
register_tool_class("data_tool", DataTool)

# Create
agent = create_agent("custom_agent")
tool = create_tool("data_tool", dataset="my_data.csv")
```

### Configuration Management

Environment-based configuration with overrides.

```python
from backend.core import Environment, get_config_manager

manager = get_config_manager()

# Load environment config
manager.load_environment_profile(Environment.PRODUCTION)

# Access config
config = manager.get_config()
print(config.server.port)  # 8000

# Set runtime values
manager.set("server.debug", False)
```

## Folder Structure

Recommended organization for extensibility:

```
backend/
├── core/                          # Extensibility framework (don't modify)
│   ├── extension_system.py       # Service & plugin registries
│   ├── factory.py                # Factory patterns
│   ├── config_manager.py         # Configuration system
│   ├── bootstrap.py              # Application initialization
│   ├── config/
│   │   ├── base.yaml            # Base configuration
│   │   ├── development.yaml     # Development overrides
│   │   ├── production.yaml      # Production overrides
│   │   ├── testing.yaml         # Test overrides
│   │   └── local.yaml.example   # Local overrides template
│   └── __init__.py
├── plugins/                       # User-created plugins (extend here)
│   ├── data_processor/           # Example plugin
│   │   ├── plugin.py            # Main plugin class
│   │   ├── agent.py             # Agent implementation
│   │   ├── tools.py             # Tools
│   │   ├── __init__.py
│   │   └── README.md            # Plugin docs
│   └── ...
├── agents/                        # Core agents
│   ├── base.py
│   ├── greeting_agent.py
│   └── ...
├── tools/                         # Core tools
│   └── ...
├── services/                      # Core services
│   ├── database.py
│   ├── cache.py
│   └── ...
├── main.py                        # Application entry point
└── main_simple.py
```

## Environment Configuration

### Multiple Environments

Configuration cascades from:
1. `base.yaml` (default, all environments)
2. `{environment}.yaml` (environment-specific)
3. `local.yaml` (local machine overrides, git-ignored)
4. Environment variables (highest priority)

### Example: Development Setup

```yaml
# backend/core/config/base.yaml
server:
  host: 0.0.0.0
  port: 8000
  debug: false

# backend/core/config/development.yaml
server:
  debug: true
  reload: true

logging:
  level: DEBUG
```

### Environment Variables

Override config at runtime:

```bash
FRAMMER_ENV=production
FRAMMER_DEBUG=false
FRAMMER_PORT=5000
GROQ_API_KEY=your_key
```

## Bootstrap & Initialization

### Simple Initialization

```python
from backend.core import initialize_app, is_app_initialized

# Initialize
if not is_app_initialized():
    initialize_app()
```

### Custom Initialization

```python
from backend.core import create_bootstrap_builder, BootstrapPhase, Environment
from pathlib import Path

def setup_agents():
    """Register custom agents"""
    from backend.core import register_agent_class
    register_agent_class("my_agent", MyAgent)

def setup_services():
    """Register custom services"""
    from backend.core import register_service
    register_service("database", Database(), singleton=True)

# Build custom bootstrap
builder = create_bootstrap_builder()
builder.with_environment(Environment.PRODUCTION)
builder.with_config_file(Path("custom_config.yaml"))
builder.on_phase(BootstrapPhase.AGENTS, setup_agents)
builder.on_phase(BootstrapPhase.SERVICES, setup_services)

success = builder.build()
```

## Creating Plugins

### Plugin Template

```python
# backend/plugins/my_plugin/plugin.py

from backend.core import Extension, ExtensionType, ServiceRegistry
import logging

logger = logging.getLogger("plugins.my_plugin")

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
        # Check dependencies
        return True
    
    def initialize(self, registry: ServiceRegistry) -> None:
        # Register your services
        from .agent import MyAgent
        registry.register_service("my_agent", MyAgent(), singleton=True)
        logger.info("MyPlugin initialized")

PLUGIN = MyPlugin()
```

Auto-discovery requirements:
- File named `plugin.py` in plugin directory
- Export `PLUGIN` instance of Extension subclass
- Plugin directory added to search path

## Dependency Injection Patterns

### Instead of Direct Imports

❌ **Bad**: Tight coupling
```python
from backend.database import Database
from backend.cache import Cache

class MyAgent:
    def __init__(self):
        self.db = Database()
        self.cache = Cache()
```

✅ **Good**: Loose coupling with DI
```python
from backend.core import get_service

class MyAgent:
    def __init__(self):
        self.db = get_service("database")
        self.cache = get_service("cache")
```

## Testing

### Test Setup with Mocks

```python
import pytest
from backend.core import get_service_registry

@pytest.fixture
def clean_registry():
    registry = get_service_registry()
    registry.clear()
    yield registry
    registry.clear()

def test_agent(clean_registry):
    # Register mocks
    mock_db = MockDatabase()
    clean_registry.register_service("database", mock_db, singleton=True)
    
    # Test with mocks
    from backend.plugins.my_plugin.agent import MyAgent
    agent = MyAgent()
    result = agent.execute("test task")
    assert result.success
```

## API Reference

### Service Registry

```python
from backend.core import get_service_registry

registry = get_service_registry()

# Methods
registry.register_service(name, service, singleton=False)
registry.get_service(name)
registry.has_service(name)
registry.list_services()
registry.clear()
```

### Plugin Registry

```python
from backend.core import get_plugin_registry, register_extension_path

registry = get_plugin_registry()
register_extension_path(Path("backend/plugins"))

# Methods
registry.register_plugin(plugin)
registry.discover_plugins()
registry.get_plugin(name)
registry.list_plugins(extension_type=None)
```

### Factory

```python
from backend.core import (
    create_agent, register_agent_class,
    create_tool, register_tool_class,
    get_component_factory
)

# Create instances
agent = create_agent("type", param=value)
tool = create_tool("type", param=value)

# List available
from backend.core import get_agent_factory
factory = get_agent_factory()
print(factory.list_agent_types())
```

### Configuration

```python
from backend.core import (
    get_config, get_config_value, set_config_value,
    get_config_manager, Environment
)

# Access
config = get_config()
value = get_config_value("server.port", default=8000)

# Modify
set_config_value("server.debug", True)

# Load environment
manager = get_config_manager()
manager.load_environment_profile(Environment.PRODUCTION)
```

## Best Practices

1. **Use dependency injection** - Never import what you can inject
2. **Keep plugins self-contained** - Group related code together
3. **Fail gracefully** - Handle missing services/plugins
4. **Document your extensions** - Plugin README, docstrings
5. **Version your APIs** - Semantic versioning for plugins
6. **Test with mocks** - Mock expensive dependencies
7. **Use configuration** - Don't hardcode values
8. **Log extensively** - Debug via logs, not guessing

## Migration Guide

### From Old Code

Convert direct imports to service-based:

```python
# Old
from backend.database import Database
db = Database()

# New
from backend.core import get_service
db = get_service("database")
```

Register existing code in bootstrap:

```python
from backend.core import register_service
register_service("my_service", MyService(), singleton=True)
```

## Documentation

- [EXTENSIBILITY_GUIDE.md](./EXTENSIBILITY_GUIDE.md) - Comprehensive extension guide
- [backend/core/](./backend/core/) - Framework source code
- [backend/plugins/data_processor_example.py](./backend/plugins/data_processor_example.py) - Complete plugin example
- Configuration files in [backend/core/config/](./backend/core/config/)

## Support

For issues or questions:
1. Check EXTENSIBILITY_GUIDE.md
2. Review example plugin
3. Check framework source code (well-commented)
4. Check application logs

---

**Created**: 2026-03-20  
**Framework Version**: 1.0.0  
**Status**: Production Ready
