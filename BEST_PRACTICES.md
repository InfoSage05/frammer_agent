# Extensible Architecture Best Practices

## Principles

### 1. Single Responsibility Principle
Each module should have one reason to change.

```python
# GOOD: Focused responsibility
class DataValidationTool:
    def validate_dataset(self, dataset):
        # Only validates data
        pass

# BAD: Multiple responsibilities
class DataUtility:
    def validate_dataset(self, dataset):
        # ...
    def query_database(self, sql):
        # ...
    def send_email(self, recipient):
        # ...
```

### 2. Dependency Inversion
Depend on abstractions, not concretions.

```python
# GOOD: Depends on abstraction
from backend.core import get_service

class MyAgent:
    def __init__(self):
        self.db = get_service("database")  # Abstract dependency

# BAD: Depends on concrete implementation
class MyAgent:
    def __init__(self):
        from backend.database import Database
        self.db = Database()  # Concrete dependency
```

### 3. Composition Over Inheritance
Use composition for flexibility.

```python
# GOOD: Composition
class EnhancedAgent:
    def __init__(self):
        self.validator = get_service("data_validator")
        self.logger = get_service("logger_service")

# LESS GOOD: Inheritance (unless there's a clear hierarchy)
class EnhancedAgent(BaseAgent):
    def __init__(self):
        super().__init__()
```

### 4. Configuration Over Code
Use configuration files for non-code decisions.

```python
# GOOD: Configuration-driven
config = get_config()
timeout = config.execution.timeout
max_retries = config.execution.max_retries

# BAD: Hardcoded values
timeout = 90
max_retries = 5
```

## Code Organization

### Directory Structure Patterns

```
Good:
  plugins/
  ├── feature_a/
  │   ├── agent.py
  │   ├── tools.py
  │   ├── plugin.py
  │   ├── config.yaml
  │   └── test_feature_a.py
  └── feature_b/

Bad:
  utils/
  ├── helpers.py         # What does this do?
  ├── tools.py           # Unclear scope
  ├── agent_utils.py     
  └── misc.py            # Catch-all folder
```

### Module Naming

```
GOOD: Descriptive names
  data_validation_agent.py
  sql_query_tool.py
  dataset_registry.py
  
BAD: Vague names
  agent.py
  utils.py
  main_logic.py
```

## Extension Development

### Plugin Template

```python
"""
Complete, well-structured plugin template.
Copy this for new plugins.
"""

from pathlib import Path
import sys
import logging

logger = logging.getLogger(__name__)

from backend.core import Extension, ExtensionType, ServiceRegistry


class MyFeaturePlugin(Extension):
    """
    Brief description of what this plugin does.
    
    Provides:
    - Feature 1 description
    - Feature 2 description
    """
    
    @property
    def name(self) -> str:
        return "my_feature"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def extension_type(self) -> ExtensionType:
        return ExtensionType.AGENT
    
    def validate(self) -> bool:
        """Check dependencies and requirements"""
        try:
            # Import required dependencies
            import numpy
            import pandas
            return True
        except ImportError as e:
            logger.error(f"Missing dependency: {e}")
            return False
    
    def initialize(self, registry: ServiceRegistry) -> None:
        """Register plugin components"""
        # Import here to avoid circular dependencies
        from .agent import MyAgent
        from .tools import MyTool1, MyTool2
        
        # Register components
        registry.register_service("my_agent", MyAgent(), singleton=True)
        registry.register_service("my_tool_1", MyTool1(), singleton=True)
        registry.register_service("my_tool_2", MyTool2(), singleton=False)
        
        logger.info(f"Initialized {self.name} v{self.version}")


# REQUIRED: Export plugin instance for auto-discovery
PLUGIN = MyFeaturePlugin()
```

## Testing Strategies

### Unit Testing with Mocks

```python
import pytest
from backend.core import get_service_registry

@pytest.fixture
def clean_services():
    """Fixture to provide clean service registry for testing"""
    registry = get_service_registry()
    registry.clear()
    yield registry
    registry.clear()


class MockDatabase:
    def query(self, sql):
        return [{"id": 1, "name": "test"}]


def test_agent_with_mocked_db(clean_services):
    # Register mock
    mock_db = MockDatabase()
    clean_services.register_service("database", mock_db, singleton=True)
    
    # Test code that uses service
    from my_plugin.agent import MyAgent
    agent = MyAgent()
    result = agent.execute("SELECT * FROM users")
    
    assert result.success
    assert len(result.data) > 0
```

### Integration Testing

```python
def test_full_plugin_workflow():
    """Test plugin end-to-end"""
    from backend.core import initialize_app, create_agent
    
    # Initialize full system
    initialize_app()
    
    # Create and use agent
    agent = create_agent("my_agent")
    result = agent.execute("test task")
    
    assert result.success
    assert result.response is not None
```

## Performance 

### Optimization Patterns

```python
# 1. Lazy Loading - Only load when needed
class MyAgent:
    def __init__(self):
        self._validator = None  # Lazy
    
    def _get_validator(self):
        if self._validator is None:
            self._validator = get_service("validator")
        return self._validator

# 2. Caching - Cache expensive results
class DataService:
    def __init__(self):
        self._cache = {}
    
    def get_data(self, key):
        if key not in self._cache:
            self._cache[key] = self._load_from_db(key)
        return self._cache[key]

# 3. Batching - Process in batches
class BulkProcessor:
    def process_batch(self, items, batch_size=100):
        for i in range(0, len(items), batch_size):
            batch = items[i:i+batch_size]
            self._process_single_batch(batch)

# 4. Async Operations - Use async for I/O
async def fetch_data_concurrent(urls):
    import asyncio
    tasks = [fetch_url(url) for url in urls]
    return await asyncio.gather(*tasks)
```

## Error Handling

### Defensive Coding

```python
# GOOD: Handle missing services gracefully
def get_optional_service(name: str):
    from backend.core import get_service_registry
    registry = get_service_registry()
    if registry.has_service(name):
        return get_service(name)
    return None

class MyAgent:
    def execute(self, task):
        # Try primary path
        cache = get_optional_service("cache")
        if cache:
            try:
                return cache.get(task)
            except Exception:
                logger.warning("Cache error, falling back")
        
        # Fallback
        return self._execute_without_cache(task)

# BAD: Assume everything exists
class MyAgent:
    def execute(self, task):
        cache = get_service("cache")
        return cache.get(task)  # Fails if service missing
```

### Error Recovery

```python
class RobustService:
    def execute_with_retry(self, func, max_retries=3):
        for attempt in range(max_retries):
            try:
                return func()
            except TemporaryError as e:
                if attempt < max_retries - 1:
                    logger.info(f"Attempt {attempt+1} failed, retrying...")
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    logger.error(f"Failed after {max_retries} attempts: {e}")
                    raise
            except PermanentError as e:
                logger.error(f"Permanent error, not retrying: {e}")
                raise
```

## Documentation

### Plugin README Template

```markdown
# Plugin Name

One-line description of what this plugin does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Configuration

Add to `backend/core/config/base.yaml`:

\`\`\`yaml
custom_settings:
  plugin_name:
    setting_1: value
    setting_2: value
\`\`\`

## Usage

\`\`\`python
from backend.core import get_service, create_agent

# As a service
service = get_service("plugin_service")
result = service.do_something()

# Or as an agent
agent = create_agent("plugin_agent")
result = agent.execute("task description")
\`\`\`

## Dependencies

- dependency1 >= 1.0.0
- dependency2 >= 2.0.0

## Examples

[Provide examples]

## Testing

Run plugin tests:

\`\`\`bash
pytest plugins/plugin_name/tests/
\`\`\`

## Author

Your Name (email@example.com)

## Version

1.0.0 (2026-03-20)
```

### Code Documentation

```python
class MyAgent:
    """
    Agent that processes data for reporting.
    
    This agent can:
    - Validate input data quality
    - Transform data to required format
    - Generate reports in multiple formats
    
    Depends on:
    - data_validator: Service for validation
    - report_generator: Service for report generation
    
    Example:
        agent = create_agent("my_agent")
        result = agent.execute(
            "Generate Q1 report",
            context={"dataset": my_data}
        )
        if result.success:
            print(result.response)
    
    Raises:
        ValueError: If input data is invalid
        TimeoutError: If processing exceeds timeout
    """
    
    def execute(self, task: str, context: dict = None) -> AgentResult:
        """
        Execute the agent's task.
        
        Args:
            task: Description of what to do
            context: Additional context including the dataset
            
        Returns:
            AgentResult with success status and results
            
        Raises:
            ValueError: If task cannot be parsed
        """
        # Implementation
        pass
```

## Monitoring & Debugging

### Logging Strategy

```python
import logging

# Create logger for your module
logger = logging.getLogger(__name__)

class MyAgent:
    def execute(self, task):
        logger.debug(f"Starting task: {task}")
        
        try:
            result = self._process(task)
            logger.info(f"Task completed successfully: {task}")
            return result
        except Exception as e:
            logger.error(f"Task failed: {task}", exc_info=True)
            raise
        finally:
            logger.debug("Cleaning up resources")
```

### Health Checks

```python
from backend.core import get_service_registry

def check_system_health():
    """Check if all critical services are working"""
    registry = get_service_registry()
    critical_services = ["database", "llm_service", "cache"]
    
    for service_name in critical_services:
        if not registry.has_service(service_name):
            logger.error(f"Critical service missing: {service_name}")
            return False
        
        try:
            service = registry.get_service(service_name)
            if hasattr(service, 'health_check'):
                if not service.health_check():
                    logger.error(f"Service unhealthy: {service_name}")
                    return False
        except Exception as e:
            logger.error(f"Cannot check service {service_name}: {e}")
            return False
    
    return True
```

## Version Management

### Semantic Versioning

```
MAJOR.MINOR.PATCH

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

Examples:
- 1.0.0 → 1.0.1 (bug fix)
- 1.0.0 → 1.1.0 (new feature)
- 1.0.0 → 2.0.0 (breaking change)
```

### Deprecation Strategy

```python
import warnings

class MyService:
    def old_method(self):
        """
        Deprecated: Use new_method() instead.
        This will be removed in version 2.0.0.
        """
        warnings.warn(
            "old_method is deprecated, use new_method instead",
            DeprecationWarning,
            stacklevel=2
        )
        return self.new_method()
    
    def new_method(self):
        # Implementation
        pass
```

---

**Last Updated**: 2026-03-20  
**Applicable to**: Frammer Extensibility Framework v1.0.0+
