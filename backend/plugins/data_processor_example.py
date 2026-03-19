"""
EXAMPLE PLUGIN: Data Processing Agent

This is a complete example of how to structure and create a plugin.

Structure:
    data_processor/
        __init__.py
        plugin.py       (main plugin class)
        agent.py        (agent implementation)
        tools.py        (tools used by agent)
        README.md       (plugin documentation)
"""

# File: backend/plugins/data_processor/plugin.py

from pathlib import Path
import sys

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.core import Extension, ExtensionType, ServiceRegistry
import logging

logger = logging.getLogger("plugins.data_processor")


class DataProcessorPlugin(Extension):
    """
    Plugin that provides data processing capabilities.
    Registers a data processing agent and related tools.
    """
    
    @property
    def name(self) -> str:
        return "data_processor"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def extension_type(self) -> ExtensionType:
        return ExtensionType.AGENT
    
    def validate(self) -> bool:
        """Validate plugin requirements"""
        try:
            import pandas  # Check for required dependency
            logger.info("Plugin validation passed")
            return True
        except ImportError:
            logger.error("Plugin requires 'pandas' - install with: pip install pandas")
            return False
    
    def initialize(self, registry: ServiceRegistry) -> None:
        """Initialize plugin and register services"""
        from .agent import DataProcessorAgent
        from .tools import DataValidatorTool, DataCleanerTool
        
        logger.info("Initializing DataProcessor plugin")
        
        # Register the main agent
        registry.register_service(
            "data_processor_agent",
            DataProcessorAgent(),
            singleton=True
        )
        
        # Register tools
        registry.register_service(
            "data_validator_tool",
            DataValidatorTool(),
            singleton=True
        )
        
        registry.register_service(
            "data_cleaner_tool",
            DataCleanerTool(),
            singleton=True
        )
        
        logger.info("DataProcessor plugin initialized successfully")


# Export the plugin instance for auto-discovery
PLUGIN = DataProcessorPlugin()


# File: backend/plugins/data_processor/agent.py

from backend.agents import AgentResult
from backend.core import get_service
import logging

logger = logging.getLogger("plugins.data_processor.agent")


class DataProcessorAgent:
    """Agent that handles data processing tasks"""
    
    name = "data_processor"
    description = "Processes datasets: validation, cleaning, transformation"
    
    def __init__(self):
        self.validator_tool = None
        self.cleaner_tool = None
    
    def _get_tools(self):
        """Lazy load tools from service registry"""
        if not self.validator_tool:
            try:
                self.validator_tool = get_service("data_validator_tool")
                self.cleaner_tool = get_service("data_cleaner_tool")
            except KeyError:
                logger.warning("Tools not available, some features disabled")
    
    def execute(self, task: str, context: dict = None, previous_results: list = None) -> AgentResult:
        """
        Execute data processing task
        
        Args:
            task: Description of processing task
            context: Conversation context
            previous_results: Results from previous steps
        
        Returns:
            AgentResult with processing outcome
        """
        self._get_tools()
        
        try:
            # Parse task
            if "validate" in task.lower():
                result = self._validate_data(task, context)
            elif "clean" in task.lower():
                result = self._clean_data(task, context)
            elif "transform" in task.lower():
                result = self._transform_data(task, context)
            else:
                result = f"Processing: {task}"
            
            return AgentResult(
                success=True,
                response=result,
                artifacts=[],
                data={"task": task}
            )
        
        except Exception as e:
            logger.error(f"Data processing error: {e}")
            return AgentResult(
                success=False,
                response="",
                error=str(e)
            )
    
    def _validate_data(self, task: str, context: dict) -> str:
        """Validate data quality"""
        if self.validator_tool:
            validation_results = self.validator_tool.validate(context.get("dataset"))
            return f"Validation complete: {validation_results}"
        return "Validation tool unavailable"
    
    def _clean_data(self, task: str, context: dict) -> str:
        """Clean data"""
        if self.cleaner_tool:
            cleaned = self.cleaner_tool.clean(context.get("dataset"))
            return f"Data cleaning complete"
        return "Cleaning tool unavailable"
    
    def _transform_data(self, task: str, context: dict) -> str:
        """Transform data"""
        return "Data transformation not yet implemented"


# File: backend/plugins/data_processor/tools.py

import logging

logger = logging.getLogger("plugins.data_processor.tools")


class DataValidatorTool:
    """Tool for data validation"""
    
    name = "data_validator"
    
    def validate(self, dataset):
        """Validate dataset quality"""
        issues = []
        
        if dataset is None:
            return {"valid": False, "issues": ["Dataset is None"]}
        
        # Check for missing values
        if hasattr(dataset, 'isnull'):
            missing = dataset.isnull().sum()
            if missing.sum() > 0:
                issues.append(f"Found {missing.sum()} missing values")
        
        # More validation logic...
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "total_checks": 5,
            "passed_checks": 5 - len(issues)
        }


class DataCleanerTool:
    """Tool for data cleaning"""
    
    name = "data_cleaner"
    
    def clean(self, dataset):
        """Clean dataset"""
        if dataset is None:
            return None
        
        # Fill missing values
        if hasattr(dataset, 'fillna'):
            dataset = dataset.fillna(method='forward')
        
        # More cleaning logic...
        
        return dataset


# File: backend/plugins/data_processor/__init__.py

"""Data Processing Plugin"""

from .plugin import PLUGIN

__all__ = ["PLUGIN"]


# File: backend/plugins/data_processor/README.md

# Data Processor Plugin

Provides data validation, cleaning, and transformation capabilities.

## Features
- Data validation with quality checks
- Data cleaning (missing values, outliers)
- Data transformation

## Configuration

Add to `backend/core/config/base.yaml`:

```yaml
custom_settings:
  data_processor:
    validate_nulls: true
    validate_types: true
    clean_method: forward_fill
```

## Usage

```python
from backend.core import get_service

agent = get_service("data_processor_agent")
result = agent.execute(
    "validate the user_data dataset",
    context={"dataset": my_dataframe}
)
```

## Dependencies
- pandas >= 1.0.0

## Author
Your Name (your.email@example.com)
"""
