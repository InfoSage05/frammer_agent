# Extensibility Framework - Visual Guide

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Your Application                              │
│  (FastAPI server, orchestrator, agents, etc.)                    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Core Modules                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Agents  │ Tools  │ Services  │ Plugins  │ Processors       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────┬─────────────────────┬──────────────────────┬──────────────┘
       │                     │                      │
       ▼                     ▼                      ▼
┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ Service Registry│  │ Plugin Registry  │  │ Factory System     │
│                 │  │                  │  │                    │
│ • Services      │  │ • Discover       │  │ • AgentFactory     │
│ • Singletons    │  │ • Load plugins   │  │ • ToolFactory      │
│ • Factories     │  │ • Initialize     │  │ • ComponentFactory │
│ • Dependencies  │  │ • Validate       │  │                    │
└─────────────────┘  └──────────────────┘  └────────────────────┘
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Configuration Manager                 │
        │                                        │
        │ • base.yaml (default)                 │
        │ • development.yaml (dev overrides)    │
        │ • production.yaml (prod overrides)    │
        │ • testing.yaml (test overrides)       │
        │ • local.yaml (machine-specific)       │
        │ • Environment variables (override)    │
        └────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Bootstrap Manager                     │
        │                                        │
        │ Phase 1: Configuration Load            │
        │ Phase 2: Services Register             │
        │ Phase 3: Plugins Load                  │
        │ Phase 4: Agents Register               │
        │ Phase 5: Tools Register                │
        └────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Application Ready                     │
        │  All systems initialized & configured │
        └────────────────────────────────────────┘
```

## Data Flow - Creating an Agent

```
1. Developer registers
   ↓
   register_agent_class("my_agent", MyAgent)
   ↓
2. AgentFactory stores
   ├─ Agent class
   └─ Configuration
   ↓
3. Developer creates
   ↓
   agent = create_agent("my_agent", param1="value")
   ↓
4. AgentFactory creates instance
   ├─ Look up agent class
   ├─ Merge configurations
   └─ Instantiate class
   ↓
5. Agent ready to use
   ↓
   result = agent.execute(task)
```

## Data Flow - Loading Configuration

```
1. Bootstrap starts
   ↓
2. ConfigManager loads in order:
   ├─ base.yaml (default)
   ├─ {environment}.yaml (override)
   ├─ local.yaml (local override)
   └─ Environment variables (final override)
   ↓
3. ConfigManager merges all
   ├─ base values
   ├─ overridden by environment
   ├─ overridden by local
   ├─ overridden by env vars
   └─ Final configuration
   ↓
4. Configuration available
   ├─ Via get_config()
   ├─ Via get_config_value(key)
   └─ Via set_config_value(key, value)
```

## Data Flow - Plugin Discovery & Loading

```
1. Plugin search path added
   ↓
   register_extension_path(Path("backend/plugins"))
   ↓
2. PluginRegistry discovers
   ├─ Scan directories
   ├─ Find plugin.py files
   └─ Import modules
   ↓
3. PluginRegistry finds PLUGIN export
   ├─ Validate plugin.validate()
   └─ Initialize plugin.initialize(registry)
   ↓
4. Plugin initialization
   ├─ Plugin imports its components
   ├─ Registers services
   ├─ Registers agents
   └─ Registers tools
   ↓
5. Plugin ready
   ├─ Services available via get_service()
   ├─ Agents available via create_agent()
   └─ Tools available via create_tool()
```

## Dependency Injection Pattern

```
Without DI (Tight Coupling):
┌─────────────────────────────────────┐
│ MyAgent                             │
├─────────────────────────────────────┤
│ import Database                     │
│ import Cache                        │
│ import Logger                       │
│                                     │
│ self.db = Database()                │
│ self.cache = Cache()                │
│ self.logger = Logger()              │
└─────────────────────────────────────┘
     │         │         │
     ▼         ▼         ▼
  Database   Cache     Logger
  (hard      (hard     (hard
   import)   import)   import)

Issue: Cannot test without real Database, Cache, Logger


With DI (Loose Coupling):
┌─────────────────────────────────────┐
│ MyAgent                             │
├─────────────────────────────────────┤
│ self.db = get_service("database")   │
│ self.cache = get_service("cache")   │
│ self.logger = get_service("logger") │
└─────────────────────────────────────┘
     │         │         │
     ▼         ▼         ▼
  Service Registry
  (can provide any implementation)

Benefits:
✓ Can test with mocks
✓ Can swap implementations
✓ Loose coupling
✓ Easy to extend
```

## Plugin Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                   Plugin Lifecycle                           │
└──────────────────────────────────────────────────────────────┘

1. DISCOVERY
   ├─ Plugin directory scanned
   ├─ plugin.py file identified  
   ├─ Module imported
   └─ PLUGIN instance exported

2. VALIDATION  
   ├─ Plugin.validate() called
   ├─ Dependencies checked
   ├─ Configuration validated
   └─ Returns True/False

3. INITIALIZATION
   ├─ Plugin.initialize(registry) called
   ├─ Services registered
   ├─ Agents registered
   ├─ Tools registered
   └─ Logging recorded

4. READY
   ├─ Services available via get_service()
   ├─ Agents available via create_agent()
   └─ Tools available via create_tool()

5. EXECUTION
   ├─ Application uses plugin features
   ├─ Services accessed when needed
   ├─ Agents created on demand
   └─ Tools utilized as required

6. SHUTDOWN (optional)
   ├─ Cleanup resources
   ├─ Close connections
   └─ Release memory
```

## Service Registry - How It Works

```
Service Registry (Single Instance)

┌─────────────────────────────────────────────────┐
│              Service Registry                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  _services = {                                  │
│    "database": <Database instance>,             │
│    "cache": <CacheFactory>,                     │
│    "logger": <Logger instance>                  │
│  }                                              │
│                                                 │
│  _singletons = {                                │
│    "config_manager": <ConfigManager>            │
│  }                                              │
│                                                 │
│  _factories = {                                 │
│    "data_tool": <ToolFactory function>          │
│  }                                              │
│                                                 │
└─────────────────────────────────────────────────┘

Access Patterns:

1. Singleton Service (Same instance every time)
   register_service("cache", cache_instance, singleton=True)
   cache = get_service("cache")  # Returns same instance always

2. Factory Service (New instance each time)  
   register_service("request_handler", request_handler_class)
   handler = get_service("request_handler")  # New instance

3. Factory Function
   register_factory("tool", lambda: MyTool(**config))
   tool = get_service("tool")  # Creates via factory
```

## Configuration Cascade

```
Configuration Priority (Highest to Lowest):

                    1. Environment Variables
                         ▲
                         │
                    2. local.yaml
                         ▲
                         │
                    3. {environment}.yaml
                    (dev/prod/test.yaml)
                         ▲
                         │
                    4. base.yaml

Example Flow:
┌─────────────────────────────────────────┐
│ base.yaml                               │
│ server:                                 │
│   port: 8000                            │
│   debug: false                          │
└─────────────────────────────────────────┘
            ↓ Merged with
┌─────────────────────────────────────────┐
│ development.yaml                        │
│ server:                                 │
│   debug: true                           │
└─────────────────────────────────────────┘
            ↓ Merged with
┌─────────────────────────────────────────┐
│ local.yaml                              │
│ server:                                 │
│   port: 9000                            │
└─────────────────────────────────────────┘
            ↓ Merged with
┌─────────────────────────────────────────┐
│ Environment Variables                   │
│ FRAMMER_DEBUG=false                     │
└─────────────────────────────────────────┘
            ↓ Result
┌─────────────────────────────────────────┐
│ Final Configuration                     │
│ server:                                 │
│   port: 9000  (from local.yaml)        │
│   debug: false (from env var override)  │
└─────────────────────────────────────────┘
```

## Bootstrap Phases

```
Application Startup Sequence:

START
  │
  ▼
┌─────────────────────────────────┐
│ Phase 1: CONFIGURATION          │
│ • Load configuration files      │
│ • Apply environment overrides   │
│ • Validate configuration        │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ Phase 2: SERVICES               │
│ • Register core services        │
│ • Initialize service registry   │
│ • Make factories available      │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ Phase 3: PLUGINS                │
│ • Discover plugins              │
│ • Load plugin modules           │
│ • Validate plugins              │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ Phase 4: AGENTS                 │
│ • Register agents               │
│ • Register callbacks            │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ Phase 5: TOOLS                  │
│ • Register tools                │
│ • Initialize tools              │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│ Phase 6: COMPLETE               │
│ Application Ready               │
└─────────────────────────────────┘
  │
  ▼
APPLICATION RUNNING
```

## File Organization - Dependencies

```
Dependency Graph (Arrows show "depends on"):

Your Application Code
  │ imports
  ├─────→ Core / __init__.py
  │       (imports everything)
  │
  ├─────→ backend.core.bootstrap
  │       │ imports
  │       ├─→ extension_system.py
  │       └─→ config_manager.py
  │
  ├─────→ backend.core.factory
  │       (standalone)
  │
  └─────→ backend.core.config_manager
          │ imports
          ├─→ config/base.yaml
          ├─→ config/{env}.yaml
          └─→ config/local.yaml

Plugins (backend/plugins/)
  └─→ backend.core.extension_system
      (to inherit from Extension)
```

## Extensibility Points

```
Where You Can Extend:

┌─────────────────────────────────────┐
│  Create Custom Agents               │
│  ├─ As Plugin                       │
│  ├─ Or Direct Registration          │
│  └─ Accessible via create_agent()   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Create Custom Tools                │
│  ├─ Within Plugins                  │
│  ├─ Or Direct Registration          │
│  └─ Accessible via create_tool()    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Create Custom Services             │
│  ├─ Register with Registry          │
│  └─ Accessible via get_service()    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Create Plugins                     │
│  ├─ Inherit from Extension          │
│  ├─ Export PLUGIN instance          │
│  └─ Auto-discovered                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Add Bootstrap Callbacks             │
│  ├─ On each phase                   │
│  └─ For custom initialization       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Add Configuration                  │
│  ├─ New settings in YAML            │
│  ├─ Environment overrides           │
│  └─ Access via get_config()         │
└─────────────────────────────────────┘
```

---

**Created**: 2026-03-20  
**For**: Frammer Extensibility Framework v1.0.0
