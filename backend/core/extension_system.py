"""
Core Extension System - Plugin Architecture for Framer Agent

This module provides the foundation for all extensibility:
- Service Registry: Central location for all services
- Plugin Registry: Discover and load plugins dynamically
- Extension Points: Well-defined interfaces for extending functionality
"""
import logging
from typing import Dict, Any, Type, Optional, Callable, List
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path
import importlib
import sys

logger = logging.getLogger("frammer.extension_system")


# ─── Extension Types ────────────────────────────────────────────────────────

class ExtensionType(Enum):
    """Types of extensions that can be registered"""
    AGENT = "agent"
    TOOL = "tool"
    DATA_SOURCE = "data_source"
    PROCESSOR = "processor"
    TRANSFORMER = "transformer"
    HANDLER = "handler"
    MIDDLEWARE = "middleware"


# ─── Service Registry ────────────────────────────────────────────────────────

class ServiceRegistry:
    """
    Central registry for all services and dependencies.
    Enables dependency injection and loose coupling between modules.
    """
    
    _instance = None
    _services: Dict[str, Any] = {}
    _factories: Dict[str, Callable] = {}
    _singletons: Dict[str, Any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def register_service(self, name: str, service: Any, singleton: bool = False):
        """
        Register a service or dependency.
        
        Args:
            name: Service identifier
            service: The service instance or factory function
            singleton: If True, reuse same instance; if False, create new each time
        """
        self._services[name] = service
        if singleton:
            self._singletons[name] = service
        logger.debug(f"Registered service: {name} (singleton={singleton})")
    
    def register_factory(self, name: str, factory: Callable):
        """
        Register a factory function to create service instances.
        
        Args:
            name: Service identifier
            factory: Function that creates service instances
        """
        self._factories[name] = factory
        logger.debug(f"Registered factory: {name}")
    
    def get_service(self, name: str) -> Any:
        """
        Retrieve a service.
        
        Args:
            name: Service identifier
            
        Returns:
            The service instance
            
        Raises:
            KeyError: If service is not registered
        """
        if name in self._singletons:
            return self._singletons[name]
        
        if name in self._factories:
            return self._factories[name]()
        
        if name in self._services:
            return self._services[name]
        
        raise KeyError(f"Service not registered: {name}")
    
    def has_service(self, name: str) -> bool:
        """Check if a service is registered"""
        return name in self._services or name in self._factories or name in self._singletons
    
    def list_services(self) -> List[str]:
        """List all registered services"""
        return list(set(self._services.keys()) | set(self._factories.keys()) | set(self._singletons.keys()))
    
    def clear(self):
        """Clear all registered services (useful for testing)"""
        self._services.clear()
        self._factories.clear()
        self._singletons.clear()


# ─── Extension Base Classes ─────────────────────────────────────────────────

class Extension(ABC):
    """Base class for all extensions"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Extension identifier"""
        pass
    
    @property
    @abstractmethod
    def version(self) -> str:
        """Extension version"""
        pass
    
    @property
    @abstractmethod
    def extension_type(self) -> ExtensionType:
        """Type of extension"""
        pass
    
    @abstractmethod
    def initialize(self, registry: ServiceRegistry) -> None:
        """
        Initialize extension and register any services.
        Called when extension is loaded.
        """
        pass
    
    def validate(self) -> bool:
        """
        Validate extension integrity.
        Override to add custom validation.
        """
        return True


# ─── Plugin Registry ────────────────────────────────────────────────────────

class PluginRegistry:
    """
    Manages discovery, loading, and lifecycle of plugins/extensions.
    Supports dynamic plugin discovery from directories.
    """
    
    _instance = None
    _plugins: Dict[str, Extension] = {}
    _loaded_modules: Dict[str, Any] = {}
    _plugin_paths: List[Path] = []
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get the singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def add_plugin_path(self, path: Path):
        """
        Add a directory to search for plugins.
        
        Args:
            path: Directory path containing plugins
        """
        path = Path(path)
        if path.is_dir() and path not in self._plugin_paths:
            self._plugin_paths.append(path)
            logger.info(f"Added plugin path: {path}")
    
    def register_plugin(self, plugin: Extension):
        """
        Manually register a plugin.
        This also validates and initializes it.
        """
        if not plugin.validate():
            raise ValueError(f"Plugin validation failed: {plugin.name}")
        
        self._plugins[plugin.name] = plugin
        
        # Initialize with service registry
        registry = ServiceRegistry.get_instance()
        plugin.initialize(registry)
        
        logger.info(f"Registered plugin: {plugin.name} v{plugin.version}")
    
    def discover_plugins(self):
        """
        Discover plugins from registered plugin paths.
        Looks for plugin.py or __init__.py files with plugin definitions.
        """
        for plugin_path in self._plugin_paths:
            self._discover_in_path(plugin_path)
    
    def _discover_in_path(self, path: Path):
        """Recursively discover plugins in a directory"""
        if not path.is_dir():
            return
        
        for item in path.iterdir():
            if item.is_dir() and not item.name.startswith('_'):
                # Check for plugin.py
                plugin_file = item / "plugin.py"
                if plugin_file.exists():
                    self._load_plugin_from_file(plugin_file)
            elif item.name == "plugin.py":
                self._load_plugin_from_file(item)
    
    def _load_plugin_from_file(self, file_path: Path):
        """Load a plugin from a Python file"""
        try:
            # Add parent dir to path if not already there
            parent = file_path.parent
            if str(parent) not in sys.path:
                sys.path.insert(0, str(parent))
            
            # Load the module
            spec = importlib.util.spec_from_file_location(
                f"plugin_{file_path.parent.name}", 
                file_path
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Look for PLUGIN export
            if hasattr(module, 'PLUGIN'):
                plugin = module.PLUGIN
                if isinstance(plugin, Extension):
                    self.register_plugin(plugin)
                    logger.info(f"Loaded plugin: {plugin.name}")
            
            self._loaded_modules[str(file_path)] = module
        except Exception as e:
            logger.error(f"Failed to load plugin from {file_path}: {e}")
    
    def get_plugin(self, name: str) -> Optional[Extension]:
        """Get a registered plugin by name"""
        return self._plugins.get(name)
    
    def list_plugins(self, extension_type: Optional[ExtensionType] = None) -> List[Extension]:
        """
        List all registered plugins, optionally filtered by type.
        
        Args:
            extension_type: If provided, only return plugins of this type
            
        Returns:
            List of plugins
        """
        plugins = list(self._plugins.values())
        if extension_type:
            plugins = [p for p in plugins if p.extension_type == extension_type]
        return plugins


# ─── Convenience Functions ───────────────────────────────────────────────────

def get_service_registry() -> ServiceRegistry:
    """Get the global service registry"""
    return ServiceRegistry.get_instance()


def get_plugin_registry() -> PluginRegistry:
    """Get the global plugin registry"""
    return PluginRegistry.get_instance()


def register_service(name: str, service: Any, singleton: bool = False):
    """Convenience function to register a service"""
    get_service_registry().register_service(name, service, singleton)


def get_service(name: str) -> Any:
    """Convenience function to get a service"""
    return get_service_registry().get_service(name)


def register_extension_path(path: Path):
    """Convenience function to add a plugin search path"""
    get_plugin_registry().add_plugin_path(path)


# ─── Decorators ─────────────────────────────────────────────────────────────

def register_agent(name: str, version: str = "1.0.0"):
    """
    Decorator to register an agent class.
    
    Usage:
        @register_agent("my_agent", "1.0.0")
        class MyAgent:
            pass
    """
    def decorator(cls):
        # Store metadata on class
        cls._extension_name = name
        cls._extension_version = version
        cls._extension_type = ExtensionType.AGENT
        return cls
    return decorator


def register_tool(name: str, version: str = "1.0.0"):
    """Decorator to register a tool"""
    def decorator(cls):
        cls._extension_name = name
        cls._extension_version = version
        cls._extension_type = ExtensionType.TOOL
        return cls
    return decorator
