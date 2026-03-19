# Migration Guide: Making Existing Code Extensible

This guide explains how to retrofit your existing Frammer Agent codebase to use the new extensibility framework with minimal disruption.

## Overview

The migration happens in phases without breaking existing functionality:

1. **Phase 1**: Import new core framework
2. **Phase 2**: Register existing agents/tools with factories
3. **Phase 3**: Move hardcoded config to config files
4. **Phase 4**: Convert hardcoded imports to dependency injection
5. **Phase 5**: Extract plugins from existing code

## Phase 1: Import New Framework

### Step 1a: Add Core Module

The `backend/core/` module is already created. No changes needed to existing code yet.

### Step 1b: Update main.py Entry Point

**File: `backend/main.py`**

Add at the top of the file after imports:

```python
# Add new import
from backend.core import initialize_app, Environment, get_config
import os

# Determine environment
env_name = os.getenv("FRAMMER_ENV", "development").lower()
environment = Environment.DEVELOPMENT if "dev" in env_name else Environment.PRODUCTION

# Initialize extensibility system ONCE at startup
if not globals().get("_frammer_initialized"):
    try:
        initialize_app(environment)
        _frammer_initialized = True
        logger.info("Frammer extensibility framework initialized")
    except Exception as e:
        logger.error(f"Failed to initialize framework: {e}")
        # Continue anyway - legacy code will still work
```

## Phase 2: Register Existing Agents

### Step 2a: Create Agent Registration

**File: `backend/agents/__init__.py`**

Add at the end of the file:

```python
# Register all agents with the factory for extensibility
def register_agents():
    """Register all agents with the factory system"""
    from backend.core import register_agent_class
    from .greeting_agent import GreetingAgent
    from .coding_agent import CodingAgent
    
    register_agent_class("greeting", GreetingAgent)
    register_agent_class("coding", CodingAgent)
    # Add other agents here as you discover them
    
    logger.info("Registered default agents with factory")

# Auto-register during bootstrap
try:
    register_agents()
except Exception as e:
    logger.warning(f"Could not auto-register agents: {e}")
```

### Step 2b: Update Agent Creation

**File: `backend/orchestrator/master.py`**

Replace direct agent instantiation:

```python
# OLD CODE
def get_agent(agent_type):
    if agent_type == "greeting":
        return GreetingAgent()
    elif agent_type == "coding":
        return CodingAgent()
    else:
        raise ValueError(f"Unknown agent: {agent_type}")

# NEW CODE
from backend.core import create_agent

def get_agent(agent_type):
    try:
        # Try new factory system first
        return create_agent(agent_type)
    except ValueError:
        # Fallback to old system for backward compatibility
        if agent_type == "greeting":
            return GreetingAgent()
        elif agent_type == "coding":
            return CodingAgent()
        else:
            raise ValueError(f"Unknown agent: {agent_type}")
```

## Phase 3: Move Configuration to Files

### Step 3a: Migrate config.py Values

Your existing `config.py` has hardcoded values. Move them to YAML:

**From: `config.py`**
```python
FAST_MODEL = "llama-3.1-8b-instant"
THINK_MODEL = "llama-3.3-70b-versatile"
```

**To: `backend/core/config/base.yaml`**
```yaml
llm:
  fast_model: llama-3.1-8b-instant
  think_model: llama-3.3-70b-versatile
```

### Step 3b: Update Code to Use New Config

**OLD:**
```python
from config import FAST_MODEL, THINK_MODEL
model = FAST_MODEL
```

**NEW:**
```python
from backend.core import get_config
config = get_config()
model = config.llm.fast_model
```

### Step 3c: Create Local Config (Don't Commit)

Create `backend/core/config/local.yaml` for your secrets:

```yaml
llm:
  api_key: "your-actual-api-key"
```

Update `.gitignore`:
```
backend/core/config/local.yaml
frontend/.env.local
```

## Phase 4: Dependency Injection Migration

### Step 4a: Convert Hardcoded Imports

**OLD: `backend/orchestrator/master.py`**
```python
from llm.groq_client import fast_complete, think_complete
from dbms import list_datasets, get_schema
from agents import get_agent

class Orchestrator:
    def __init__(self):
        self.llm = fast_complete  # Direct reference
```

**NEW:**
```python
from backend.core import get_service

class Orchestrator:
    def __init__(self):
        # Get dependencies from service registry
        self.llm_service = get_service("llm_service")
        self.db_service = get_service("database")
        self.agent_factory = get_service("agent_factory")
```

### Step 4b: Register Services During Bootstrap

**File: `backend/agents/__init__.py` or new `backend/services/__init__.py`**

```python
from backend.core import register_service, BootstrapPhase, get_bootstrap_manager

def register_core_services():
    """Register core services with the service registry"""
    from llm.groq_client import LLMService
    from dbms.database import Database
    
    # Register as singletons (shared across entire app)
    register_service("llm_service", LLMService(), singleton=True)
    register_service("database", Database(), singleton=True)
    
    logger.info("Registered core services")

# Register this callback during bootstrap
try:
    when_initialized = get_bootstrap_manager()
    when_initialized.register_phase_callback(
        BootstrapPhase.SERVICES,
        register_core_services
    )
except:
    pass  # Not yet initialized
```

## Phase 5: Extract and Organize Plugins

### Step 5a: Identify Plugin Candidates

Look at your existing code:
- **Analytics Engine** → Analytics Plugin
- **SQL Agent** → SQL Query Plugin
- **Code Agent/Executor** → Code Execution Plugin
- **Recommendation Engine** → Recommendation Plugin

### Step 5b: Create Plugin Structure

Example: SQL Agent → Plugin

```
backend/plugins/sql_agent/
├── __init__.py
├── plugin.py           # Main extract extension
├── agent.py            # SqlAgent extracted from backend/sql_agent/agent.py
├── tools.py            # SQL execution tools
└── README.md
```

### Step 5c: Example Plugin Extraction

**Current: `backend/sql_agent/agent.py`**
```python
class SqlAgent:
    def execute(self, query):
        # current implementation
        pass
```

**New: `backend/plugins/sql_agent/plugin.py`**
```python
from backend.core import Extension, ExtensionType, ServiceRegistry
from .agent import SqlAgent

class SqlAgentPlugin(Extension):
    @property
    def name(self) -> str:
        return "sql_agent"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def extension_type(self) -> ExtensionType:
        return ExtensionType.AGENT
    
    def initialize(self, registry: ServiceRegistry) -> None:
        from backend.core import register_agent_class
        register_agent_class("sql", SqlAgent)

PLUGIN = SqlAgentPlugin()
```

## Gradual Rollout

### Option A: Backward Compatible (Recommended)

Keep old code working while new code gradually adopts new patterns:

```python
# Services can provide both old and new interfaces
class DatabaseService:
    def query(self, sql):
        # new interface
        pass
    
    # Keep old function for backward compatibility
    def legacy_get_schema(self):
        return get_schema()  # Old function

# Register as service
register_service("database", DatabaseService(), singleton=True)
```

### Option B: Parallel Implementation

Run new system alongside old:

```python
# Initialize new framework
initialize_app()

# Old code still works as before
from config import FAST_MODEL

# New code uses new patterns
from backend.core import get_config
config = get_config()
```

## Migration Checklist

Use this checklist to track your migration:

- [ ] `backend/core/` module created and imported in `main.py`
- [ ] `initialize_app()` called during startup
- [ ] Existing agents registered with factory
- [ ] Configuration migrated from code to YAML
- [ ] Core services registered in service registry
- [ ] Environment-specific config files created (dev, prod, test)
- [ ] New code uses `get_service()` instead of direct imports
- [ ] Documentation updated with new patterns
- [ ] Team members trained on new system
- [ ] Analytics Engine extracted as plugin
- [ ] SQL Agent extracted as plugin
- [ ] Code Agent extracted as plugin
- [ ] All tests passing
- [ ] Old hardcoded imports marked for deprecation

## Validation Steps

After each phase, verify:

```python
# Test 1: Framework initializes
from backend.core import initialize_app, is_app_initialized
initialize_app()
assert is_app_initialized()

# Test 2: Agents registered
from backend.core import create_agent
agent = create_agent("greeting")
assert agent is not None

# Test 3: Services available
from backend.core import get_service
config = get_service("config_manager")
assert config is not None

# Test 4: Configuration loaded
from backend.core import get_config
config = get_config()
assert config.server.port > 0
```

## Troubleshooting

### Issue: ImportError in new core module

**Solution**: Make sure `backend/core/` is in Python path:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
```

### Issue: Services not found during execution

**Solution**: Ensure `initialize_app()` is called before accessing services:
```python
from backend.core import initialize_app, get_service
initialize_app()  # Must be called first
service = get_service("my_service")
```

### Issue: Configuration not loading

**Solution**: Check config file paths:
```python
from backend.core import get_config_manager
manager = get_config_manager()
print(manager._config_files)  # See which files were loaded
```

## Next Steps

1. **Immediate**: Import core framework, register existing agents
2. **Short-term**: Move configuration to YAML files  
3. **Medium-term**: Convert imports to dependency injection
4. **Long-term**: Extract major components as plugins

## Example: Complete Migration

See `EXTENSIBILITY_GUIDE.md` for complete examples of:
- Creating plugins
- Using dependency injection
- Configuration management
- Bootstrap customization

---

**Timeline**: 2-4 weeks for full migration  
**Risk**: Low (backward compatible design)  
**Benefit**: 10x more extensible codebase
