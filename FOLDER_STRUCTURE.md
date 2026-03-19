# Folder Structure Reference

This document outlines the recommended folder structure for an extensible Frammer application.

## Complete Folder Structure

```
gc26-master/
│
├── backend/                                      # Backend application
│   ├── core/                                     # Extensibility framework ⭐ NEW
│   │   ├── __init__.py                          # Export framework
│   │   ├── extension_system.py                  # Service/plugin registries
│   │   ├── factory.py                           # Factory patterns
│   │   ├── config_manager.py                    # Configuration system
│   │   ├── bootstrap.py                         # Initialization
│   │   ├── config/
│   │   │   ├── base.yaml                        # Default config
│   │   │   ├── development.yaml                 # Dev overrides
│   │   │   ├── production.yaml                  # Prod overrides
│   │   │   ├── testing.yaml                     # Test overrides
│   │   │   └── local.yaml.example               # Local template
│   │   └── README.md                            # Framework docs
│   │
│   ├── plugins/                                 # User-created plugins ⭐ NEW
│   │   ├── __init__.py
│   │   ├── data_processor_example.py            # Example plugin
│   │   │
│   │   ├── sql_query_plugin/                    # Plugin: SQL tasks
│   │   │   ├── __init__.py
│   │   │   ├── plugin.py                        # Plugin class
│   │   │   ├── agent.py                         # Agent logic
│   │   │   ├── tools.py                         # Tools/helpers
│   │   │   ├── config.yaml                      # Plugin config
│   │   │   ├── tests/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── test_agent.py
│   │   │   │   └── test_tools.py
│   │   │   └── README.md                        # Plugin docs
│   │   │
│   │   ├── analytics_plugin/                    # Plugin: Analytics
│   │   │   ├── __init__.py
│   │   │   ├── plugin.py
│   │   │   ├── agent.py
│   │   │   ├── tools.py
│   │   │   └── README.md
│   │   │
│   │   └── recommendation_plugin/               # Plugin: Recommendations
│   │       ├── __init__.py
│   │       ├── plugin.py
│   │       ├── agent.py
│   │       ├── tools.py
│   │       └── README.md
│   │
│   ├── agents/                                  # Core agents
│   │   ├── __init__.py
│   │   ├── base.py                              # Base agent protocol
│   │   ├── greeting_agent.py                    # Greeting agent
│   │   ├── coding_agent.py                      # Coding agent
│   │   └── test_agents.py
│   │
│   ├── tools/                                   # Core tools
│   │   ├── __init__.py
│   │   ├── chart_renderer.py
│   │   ├── file_ingest.py
│   │   └── test_tools.py
│   │
│   ├── services/                                # Core services ⭐ IMPROVED
│   │   ├── __init__.py
│   │   ├── data_service.py                      # Data operations
│   │   ├── cache_service.py                     # Caching service
│   │   ├── validation_service.py                # Data validation
│   │   └── test_services.py
│   │
│   ├── orchestrator/                            # Orchestration
│   │   ├── __init__.py
│   │   ├── master.py                            # Main orchestrator
│   │   ├── graph.py                             # Graph definitions
│   │   ├── graph_new.py
│   │   ├── nodes.py                             # Node functions
│   │   └── test_orchestrator.py
│   │
│   ├── analytics/                               # Analytics engine
│   │   ├── __init__.py
│   │   ├── analytics_engine.py
│   │   ├── script_generator.py
│   │   ├── script_executor.py
│   │   ├── column_mapper.py
│   │   └── test_analytics.py
│   │
│   ├── sql_agent/                               # SQL agent (can become plugin)
│   │   ├── __init__.py
│   │   ├── agent.py
│   │   ├── tools.py
│   │   ├── database.py
│   │   └── test_sql_agent.py
│   │
│   ├── context_manager/                         # Context management
│   │   ├── __init__.py
│   │   ├── registry.py
│   │   ├── retrieval.py
│   │   └── test_context.py
│   │
│   ├── code_agent/                              # Code execution
│   │   ├── __init__.py
│   │   ├── executor.py
│   │   ├── generator.py
│   │   ├── generator_new.py
│   │   ├── sandbox.py
│   │   └── test_code_agent.py
│   │
│   ├── narration/                               # Narration engine
│   │   ├── __init__.py
│   │   ├── narrator.py
│   │   └── test_narrator.py
│   │
│   ├── dbms/                                    # Database interface
│   │   ├── __init__.py
│   │   ├── dbms_agent.py
│   │   ├── preset_functions.py
│   │   └── test_dbms.py
│   │
│   ├── rec_engine/                              # Recommendation engine
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── agent/
│   │   ├── data/
│   │   ├── tools/
│   │   └── test_rec_engine.py
│   │
│   ├── conversation_memory.py                   # Conversation state
│   ├── session.py                               # Session management
│   ├── agent_tools.py                           # Shared tools
│   ├── dataset_registry.py                      # Dataset registry
│   │
│   ├── main.py                                  # Main entry point ⭐ UPDATED
│   ├── main_simple.py                           # Simplified entry point
│   ├── simple_server.py                         # Simple server
│   │
│   └── __init__.py
│
├── llm/                                         # LLM client
│   ├── __init__.py
│   ├── groq_client.py                           # Groq API client
│   └── test_llm.py
│
├── frontend/                                    # Next.js frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── ...
│
├── data/                                        # Data files
│   ├── datasets/                                # CSV datasets
│   ├── chroma/                                  # Vector DB
│   ├── saved_analytics/                         # Analytics results
│   ├── analytics_dashboard.json
│   └── chart_data/
│
├── tests/                                       # Test suite
│   ├── __init__.py
│   ├── conftest.py                              # Pytest config
│   ├── integration/
│   │   ├── test_full_workflow.py
│   │   └── test_plugins.py
│   ├── unit/
│   │   ├── test_core.py
│   │   └── test_factories.py
│   └── fixtures/
│       ├── sample_data.py
│       └── mock_services.py
│
├── docs/                                        # Documentation
│   ├── ARCHITECTURE.md                          # Architecture docs
│   ├── API.md                                   # API reference
│   ├── DEPLOYMENT.md                            # Deployment guide
│   └── TROUBLESHOOTING.md                       # Troubleshooting
│
├── .gitignore                                   # Git ignore rules
├── .env.example                                 # Example env vars
├── config.py                                    # Legacy config (keep for now)
├── README.md                                    # Project README
├── EXTENSIBILITY_ARCHITECTURE.md                # Extensibility overview ⭐ NEW
├── EXTENSIBILITY_GUIDE.md                       # Extension guide ⭐ NEW
├── MIGRATION_GUIDE.md                           # Migration guide ⭐ NEW
├── BEST_PRACTICES.md                            # Best practices ⭐ NEW
├── requirements.txt                             # Python dependencies
│
├── docker-compose.yml                           # Docker composition
├── Dockerfile.backend                           # Backend image
├── Dockerfile.frontend                          # Frontend image
├── .dockerignore
│
└── start_backend.bat                            # Windows startup

```

## Key Changes from Current Structure

### Added (⭐ NEW)
- `backend/core/` - Extensibility framework  
- `backend/plugins/` - Plugin directory
- `backend/services/` - Centralized services
- `tests/` - Organized test suite
- `docs/` - Documentation directory
- Documentation files (guides, architecture, best practices)

### Improved (⭐ IMPROVED)
- `backend/main.py` - Now uses extensibility framework
- Better separation of concerns
- Clear plugin architecture

### Kept (for backward compatibility)
- All existing modules can continue to work
- `config.py` remains but gradually migrates to YAML
- Existing code doesn't break

## File Organization Patterns

### Module Layout (Each Plugin/Component)

```
component/
├── __init__.py                # Exports public API
├── plugin.py                  # Plugin class (if plugin)
├── agent.py                   # Agent logic (if applicable)
├── tools.py                   # Tools/helpers
├── service.py                 # Service class (if applicable)
├── config.yaml                # Component config
├── exceptions.py              # Custom exceptions
├── README.md                  # Documentation
├── tests/
│   ├── __init__.py
│   ├── test_agent.py
│   ├── test_tools.py
│   └── test_integration.py
└── fixtures/                  # Test fixtures
    ├── sample_data.py
    └── mocks.py
```

### Test Organization

```
tests/
├── conftest.py                # Pytest configuration
├── fixtures.py                # Shared test fixtures
│
├── unit/                       # Unit tests (no external dependencies)
│   ├── agents/
│   ├── services/
│   └── tools/
│
├── integration/                # Integration tests (with real services)
│   ├── test_full_workflow.py
│   ├── test_plugin_system.py
│   └── test_bootstrap.py
│
└── performance/                # Performance/stress tests
    └── test_load.py
```

### Configuration Files

```
backend/core/config/
├── base.yaml                   # Base configuration
├── development.yaml            # Development overrides
├── production.yaml             # Production overrides
├── testing.yaml                # Testing overrides
├── local.yaml                  # Local machine (git-ignored)
└── local.yaml.example          # Template for local.yaml
```

## Naming Conventions

### Modules
- `agent.py` - Agent implementations
- `service.py` - Service class
- `tools.py` - Tools/utilities for a component
- `config.yaml` - Component configuration
- `plugin.py` - Plugin class definition

### Classes
```
# Agents
class MyAgent
class DataProcessingAgent
class AnalyticsAgent

# Services
class DatabaseService
class CacheService
class ValidationService

# Plugins
class MyFeaturePlugin
class SqlAgentPlugin
class AnalyticsPlugin

# Tools
class DataValidatorTool
class ReportGeneratorTool
```

### Functions
```
# Factory functions
def create_agent(type, **kwargs)
def register_agent_class(type, class)

# Utility functions
def validate_input(data)
def transform_data(data)

# Service getters
def get_service(name)
def get_config()
```

### Constants

```python
# In config files or constants module
DEFAULT_TIMEOUT = 90
MAX_RETRIES = 5
SUPPORTED_FORMATS = [".csv", ".json"]
```

## Import Organization

### Within Modules

```python
# 1. Standard library imports
import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional

# 2. Third-party imports
import numpy as np
import pandas as pd

# 3. Local framework imports
from backend.core import get_service, get_config

# 4. Component imports
from .agent import MyAgent
from .tools import MyTool
```

### Circular Dependency Prevention

```python
# GOOD: Import in function, not at module level
class MyAgent:
    def execute(self, task):
        from backend.core import get_service  # Import when needed
        db = get_service("database")

# BAD: Import at module level (potential circular dependency)
from backend.core import get_service
db = get_service("database")
```

## CI/CD Folder

Optional: For CI/CD configuration

```
.ci/
├── build.sh                    # Build script
├── test.sh                     # Test script
├── deploy.sh                   # Deploy script
├── github/
│   └── workflows/
│       ├── tests.yml
│       ├── lint.yml
│       └── deploy.yml
└── scripts/
    ├── setup_dev_env.sh
    └── validate_code.sh
```

## Data Organization

```
data/
├── datasets/                   # Source datasets (CSVs)
│   ├── channel-wise-publishing.csv
│   ├── client_combined_dataset.csv
│   └── ...
│
├── processed/                  # Processed/cleaned data
│   └── cleaned_datasets/
│
├── chroma/                     # Vector database
│
├── saved_analytics/            # Results of analytics
│   ├── 2026-03-20/
│   │   ├── analysis_result.json
│   │   └── charts.png
│   └── 2026-03-21/
│
└── cache/                      # Temporary cache
    └── query_results/
```

## Environment Files

```
Project root:
├── .env                        # Local environment (git-ignored)
├── .env.example                # Template for .env
├── .env.production              # Production env (if needed)
└── .env.test                   # Test env (if needed)
```

Contents of `.env`:
```
# Backend
FRAMMER_ENV=development
GROQ_API_KEY=your-api-key-here
FRAMMER_DATA_DIR=./data

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

**Last Updated**: 2026-03-20  
**Compatible With**: Extensibility Framework v1.0.0+
