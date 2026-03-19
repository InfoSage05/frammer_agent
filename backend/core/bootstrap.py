"""
Application Bootstrap and Initialization System

Handles:
- Initialization order and dependencies
- Service registration
- Plugin loading
- Configuration setup
- Graceful error handling
"""
import logging
import sys
from pathlib import Path
from typing import Optional, Callable, List
from enum import Enum

from .extension_system import ServiceRegistry, PluginRegistry, get_service_registry, get_plugin_registry
from .factory import AgentFactory, ToolFactory, ComponentFactory
from .config_manager import ConfigManager, Environment, get_config_manager, get_config

logger = logging.getLogger("frammer.bootstrap")


# ─── Bootstrap Phases ───────────────────────────────────────────────────────

class BootstrapPhase(Enum):
    """Application bootstrap phases"""
    CONFIGURATION = "configuration"
    SERVICES = "services"
    PLUGINS = "plugins"
    AGENTS = "agents"
    TOOLS = "tools"
    COMPLETE = "complete"


# ─── Bootstrap Manager ──────────────────────────────────────────────────────

class BootstrapManager:
    """
    Manages application initialization in phases.
    Ensures correct initialization order and handles errors gracefully.
    """
    
    _instance = None
    _initialized = False
    _current_phase: Optional[BootstrapPhase] = None
    _phase_callbacks: dict = {}
    _initialization_errors: List[tuple] = []
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._phase_callbacks = {
                BootstrapPhase.CONFIGURATION: [],
                BootstrapPhase.SERVICES: [],
                BootstrapPhase.PLUGINS: [],
                BootstrapPhase.AGENTS: [],
                BootstrapPhase.TOOLS: [],
            }
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def register_phase_callback(self, phase: BootstrapPhase, callback: Callable):
        """Register a callback to run during a bootstrap phase"""
        if phase not in self._phase_callbacks:
            self._phase_callbacks[phase] = []
        self._phase_callbacks[phase].append(callback)
    
    def initialize(self, environment: Environment = Environment.DEVELOPMENT) -> bool:
        """
        Initialize the application.
        
        Args:
            environment: Environment to initialize for
            
        Returns:
            True if initialization succeeded, False otherwise
        """
        if self._initialized:
            logger.warning("Application already initialized")
            return True
        
        try:
            # Phase 1: Load configuration
            self._current_phase = BootstrapPhase.CONFIGURATION
            logger.info("Bootstrap phase: Configuration")
            self._run_phase_callbacks(BootstrapPhase.CONFIGURATION)
            
            config_manager = get_config_manager()
            config_manager.load_environment_profile(environment)
            config = get_config()
            logger.info(f"Loaded configuration for environment: {environment.value}")
            
            # Phase 2: Register services
            self._current_phase = BootstrapPhase.SERVICES
            logger.info("Bootstrap phase: Services")
            self._run_phase_callbacks(BootstrapPhase.SERVICES)
            
            # Register core factories
            service_registry = get_service_registry()
            service_registry.register_service("agent_factory", AgentFactory.get_instance(), singleton=True)
            service_registry.register_service("tool_factory", ToolFactory.get_instance(), singleton=True)
            service_registry.register_service("component_factory", ComponentFactory.get_instance(), singleton=True)
            service_registry.register_service("config_manager", config_manager, singleton=True)
            
            logger.info("Registered core services")
            
            # Phase 3: Load plugins
            self._current_phase = BootstrapPhase.PLUGINS
            logger.info("Bootstrap phase: Plugins")
            
            if config.extensions.auto_load:
                plugin_registry = get_plugin_registry()
                
                # Add plugin paths
                for plugin_path in config.extensions.plugin_paths:
                    plugin_registry.add_plugin_path(Path(plugin_path))
                
                # Auto-discover plugins
                if config.extensions.auto_discover:
                    plugin_registry.discover_plugins()
                    logger.info(f"Discovered {len(plugin_registry.list_plugins())} plugins")
            
            self._run_phase_callbacks(BootstrapPhase.PLUGINS)
            
            # Phase 4: Register agents
            self._current_phase = BootstrapPhase.AGENTS
            logger.info("Bootstrap phase: Agents")
            self._run_phase_callbacks(BootstrapPhase.AGENTS)
            
            # Phase 5: Register tools
            self._current_phase = BootstrapPhase.TOOLS
            logger.info("Bootstrap phase: Tools")
            self._run_phase_callbacks(BootstrapPhase.TOOLS)
            
            self._initialized = True
            self._current_phase = BootstrapPhase.COMPLETE
            
            logger.info("Application bootstrap complete")
            return True
            
        except Exception as e:
            logger.error(f"Bootstrap failed at phase {self._current_phase}: {e}", exc_info=True)
            self._initialization_errors.append((self._current_phase, str(e)))
            return False
    
    def _run_phase_callbacks(self, phase: BootstrapPhase):
        """Run all callbacks for a phase"""
        callbacks = self._phase_callbacks.get(phase, [])
        for callback in callbacks:
            try:
                callback()
            except Exception as e:
                logger.error(f"Error in phase callback for {phase}: {e}", exc_info=True)
                self._initialization_errors.append((phase, str(e)))
    
    def is_initialized(self) -> bool:
        """Check if application is initialized"""
        return self._initialized
    
    def get_initialization_errors(self) -> List[tuple]:
        """Get list of initialization errors"""
        return self._initialization_errors.copy()
    
    def shutdown(self):
        """Clean up resources"""
        logger.info("Application shutdown")
        self._initialized = False
        self._current_phase = None


# ─── Bootstrap Builder ──────────────────────────────────────────────────────

class BootstrapBuilder:
    """Fluent builder for customizing bootstrap behavior"""
    
    def __init__(self):
        self.environment = Environment.DEVELOPMENT
        self.phase_callbacks = {}
        self.service_registrations = []
        self.plugin_paths = []
        self.config_files = []
    
    def with_environment(self, environment: Environment) -> "BootstrapBuilder":
        """Set the environment"""
        self.environment = environment
        return self
    
    def with_config_file(self, config_file: Path) -> "BootstrapBuilder":
        """Add a configuration file"""
        self.config_files.append(config_file)
        return self
    
    def with_plugin_path(self, plugin_path: Path) -> "BootstrapBuilder":
        """Add a plugin search path"""
        self.plugin_paths.append(plugin_path)
        return self
    
    def on_phase(self, phase: BootstrapPhase, callback: Callable) -> "BootstrapBuilder":
        """Register a callback for a bootstrap phase"""
        if phase not in self.phase_callbacks:
            self.phase_callbacks[phase] = []
        self.phase_callbacks[phase].append(callback)
        return self
    
    def register_service(self, name: str, service, singleton: bool = False) -> "BootstrapBuilder":
        """Register a service"""
        self.service_registrations.append((name, service, singleton))
        return self
    
    def build(self) -> bool:
        """Execute the bootstrap"""
        manager = BootstrapManager.get_instance()
        
        # Register phase callbacks
        for phase, callbacks in self.phase_callbacks.items():
            for callback in callbacks:
                manager.register_phase_callback(phase, callback)
        
        # Add configuration files
        config_manager = get_config_manager()
        for config_file in self.config_files:
            config_manager.load_from_file(config_file)
        
        # Add plugin paths
        plugin_registry = get_plugin_registry()
        for plugin_path in self.plugin_paths:
            plugin_registry.add_plugin_path(plugin_path)
        
        # Register services
        service_registry = get_service_registry()
        for name, service, singleton in self.service_registrations:
            service_registry.register_service(name, service, singleton)
        
        # Initialize
        return manager.initialize(self.environment)


# ─── Convenience Functions ──────────────────────────────────────────────────

def get_bootstrap_manager() -> BootstrapManager:
    """Get the bootstrap manager"""
    return BootstrapManager.get_instance()


def initialize_app(environment: Environment = Environment.DEVELOPMENT) -> bool:
    """Initialize the application with default settings"""
    manager = get_bootstrap_manager()
    return manager.initialize(environment)


def is_app_initialized() -> bool:
    """Check if app is initialized"""
    return get_bootstrap_manager().is_initialized()


def create_bootstrap_builder() -> BootstrapBuilder:
    """Create a bootstrap builder for custom initialization"""
    return BootstrapBuilder()
