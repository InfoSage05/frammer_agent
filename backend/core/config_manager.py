"""
Advanced Configuration System - Profiles, Environment-based config, and Extensions

Provides:
- Configuration profiles (dev, test, prod)
- Environment variable overrides
- Configuration validation
- Dynamic configuration loading from files
"""
import os
import json
import logging
from typing import Dict, Any, Optional, Type, List
from pathlib import Path
from dataclasses import dataclass, asdict, field
from enum import Enum
import yaml

logger = logging.getLogger("frammer.config")


# ─── Environment Profiles ───────────────────────────────────────────────────

class Environment(Enum):
    """Available environments"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    PRODUCTION = "production"


# ─── Configuration Base Classes ─────────────────────────────────────────────

@dataclass
class BaseConfig:
    """Base configuration class"""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert configuration to JSON string"""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        """Create configuration from dictionary"""
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str: str):
        """Create configuration from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)


@dataclass
class ServerConfig(BaseConfig):
    """Server configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    workers: int = 1
    reload: bool = False


@dataclass
class DatabaseConfig(BaseConfig):
    """Database configuration"""
    sqlite_path: str = "data/registry.db"
    chroma_path: str = "data/chroma"
    connection_pool_size: int = 5
    log_queries: bool = False


@dataclass
class LLMConfig(BaseConfig):
    """LLM configuration"""
    fast_model: str = "llama-3.1-8b-instant"
    think_model: str = "llama-3.3-70b-versatile"
    api_key: str = ""
    timeout: int = 30
    max_retries: int = 3


@dataclass
class ExecutionConfig(BaseConfig):
    """Code execution configuration"""
    timeout: int = 90
    max_retries: int = 5
    max_context_tokens: int = 8000
    sandbox_enabled: bool = True


@dataclass
class ExtensionConfig(BaseConfig):
    """Extension and plugin configuration"""
    plugin_paths: List[str] = field(default_factory=list)
    auto_discover: bool = True
    auto_load: bool = True


@dataclass
class LoggingConfig(BaseConfig):
    """Logging configuration"""
    level: str = "INFO"
    format: str = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    file_path: str = "logs/frammer.log"
    max_file_size: int = 10_000_000  # 10MB
    backup_count: int = 5


@dataclass
class ApplicationConfig(BaseConfig):
    """Complete application configuration"""
    environment: str = Environment.DEVELOPMENT.value
    data_dir: str = "data"
    datasets_dir: str = "data/datasets"
    
    server: ServerConfig = field(default_factory=ServerConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    execution: ExecutionConfig = field(default_factory=ExecutionConfig)
    extensions: ExtensionConfig = field(default_factory=ExtensionConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    
    # Custom settings
    custom_settings: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, recursively converting nested configs"""
        return {
            "environment": self.environment,
            "data_dir": self.data_dir,
            "datasets_dir": self.datasets_dir,
            "server": asdict(self.server),
            "database": asdict(self.database),
            "llm": asdict(self.llm),
            "execution": asdict(self.execution),
            "extensions": asdict(self.extensions),
            "logging": asdict(self.logging),
            "custom_settings": self.custom_settings,
        }


# ─── Configuration Manager ──────────────────────────────────────────────────

class ConfigManager:
    """
    Central configuration management.
    Handles config loading, validation, and runtime overrides.
    """
    
    _instance = None
    _config: Optional[ApplicationConfig] = None
    _config_files: List[Path] = []
    _environment_overrides: Dict[str, str] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def load_default_config(self) -> ApplicationConfig:
        """Load default configuration"""
        self._config = ApplicationConfig()
        logger.info("Loaded default configuration")
        return self._config
    
    def load_from_file(self, config_path: Path) -> ApplicationConfig:
        """
        Load configuration from a YAML or JSON file.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Loaded configuration
        """
        config_path = Path(config_path)
        
        if not config_path.exists():
            logger.warning(f"Config file not found: {config_path}")
            return self.load_default_config()
        
        try:
            if config_path.suffix == ".yaml" or config_path.suffix == ".yml":
                with open(config_path) as f:
                    data = yaml.safe_load(f) or {}
            elif config_path.suffix == ".json":
                with open(config_path) as f:
                    data = json.load(f)
            else:
                logger.warning(f"Unsupported config file format: {config_path.suffix}")
                return self.load_default_config()
            
            # Merge with defaults
            self._config = self._merge_config(ApplicationConfig(), data)
            self._config_files.append(config_path)
            logger.info(f"Loaded configuration from: {config_path}")
            return self._config
            
        except Exception as e:
            logger.error(f"Failed to load config from {config_path}: {e}")
            return self.load_default_config()
    
    def load_environment_profile(self, environment: Environment) -> ApplicationConfig:
        """
        Load configuration for a specific environment.
        Looks for config files in order: base, environment-specific, local overrides.
        
        Args:
            environment: Environment to load config for
            
        Returns:
            Loaded configuration
        """
        base_dir = Path(__file__).parent / "config"
        base_dir.mkdir(exist_ok=True)
        
        configs = []
        
        # Load base config
        base_config = base_dir / "base.yaml"
        if base_config.exists():
            configs.append(base_config)
        
        # Load environment-specific config
        env_config = base_dir / f"{environment.value}.yaml"
        if env_config.exists():
            configs.append(env_config)
        
        # Load local overrides
        local_config = base_dir / "local.yaml"
        if local_config.exists():
            configs.append(local_config)
        
        # Load all configs in order
        self.load_default_config()
        for config_file in configs:
            self.load_from_file(config_file)
        
        # Apply environment variable overrides
        self._apply_env_overrides()
        
        return self._config
    
    def _merge_config(self, base: ApplicationConfig, overrides: Dict[str, Any]) -> ApplicationConfig:
        """Recursively merge override dict into base config"""
        data = asdict(base)
        
        for key, value in overrides.items():
            if isinstance(value, dict) and key in data and isinstance(data[key], dict):
                # Recursive merge for nested dicts
                data[key] = {**data[key], **value}
            else:
                data[key] = value
        
        return ApplicationConfig(**data)
    
    def _apply_env_overrides(self):
        """Apply environment variable overrides to config"""
        if not self._config:
            return
        
        # Environment variables take precedence
        env_overrides = {
            "FRAMMER_ENV": ("environment",),
            "FRAMMER_DEBUG": ("server", "debug"),
            "FRAMMER_PORT": ("server", "port"),
            "FRAMMER_LOG_LEVEL": ("logging", "level"),
            "GROQ_API_KEY": ("llm", "api_key"),
        }
        
        for env_var, config_path in env_overrides.items():
            if env_var in os.environ:
                self._set_nested_config(config_path, os.environ[env_var])
    
    def _set_nested_config(self, path: tuple, value: Any):
        """Set a nested config value"""
        if not self._config:
            return
        
        config_dict = asdict(self._config)
        current = config_dict
        
        for key in path[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        # Type conversion
        if path[-1] in current:
            current_type = type(current[path[-1]])
            if current_type == bool:
                value = value.lower() in ("true", "1", "yes")
            elif current_type == int:
                value = int(value)
        
        current[path[-1]] = value
        self._config = ApplicationConfig(**config_dict)
    
    def get_config(self) -> ApplicationConfig:
        """Get current configuration"""
        if self._config is None:
            self.load_default_config()
        return self._config
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get config value by dot-notation path"""
        config = self.get_config()
        parts = key.split(".")
        value = asdict(config)
        
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any):
        """Set config value by dot-notation path"""
        config = self.get_config()
        parts = key.split(".")
        config_dict = asdict(config)
        current = config_dict
        
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        
        current[parts[-1]] = value
        self._config = ApplicationConfig(**config_dict)
    
    def add_custom_setting(self, key: str, value: Any):
        """Add or update a custom setting"""
        if self._config:
            self._config.custom_settings[key] = value


# ─── Convenience Functions ──────────────────────────────────────────────────

def get_config_manager() -> ConfigManager:
    """Get the global config manager"""
    return ConfigManager.get_instance()


def get_config() -> ApplicationConfig:
    """Get the current application configuration"""
    return get_config_manager().get_config()


def get_config_value(key: str, default: Any = None) -> Any:
    """Get a config value"""
    return get_config_manager().get(key, default)


def set_config_value(key: str, value: Any):
    """Set a config value"""
    get_config_manager().set(key, value)
