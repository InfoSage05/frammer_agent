"""
Simple in-memory dataset registry
Loads all CSV files at startup, stores metadata
"""
import os
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional
import json

class DatasetRegistry:
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.datasets: Dict[str, dict] = {}
        self._load_all()
    
    def _load_all(self):
        """Load all CSV files and store metadata"""
        print(f"📁 Loading datasets from {self.data_dir}")
        
        csv_files = list(self.data_dir.glob("*.csv"))
        for filepath in csv_files:
            try:
                df = pd.read_csv(filepath)
                name = filepath.stem
                
                # Store metadata
                self.datasets[name] = {
                    "name": name,
                    "path": str(filepath.absolute()),
                    "rows": len(df),
                    "columns": df.columns.tolist(),
                    "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                    "sample": df.head(3).to_dict('records'),
                    "null_counts": df.isnull().sum().to_dict()
                }
                print(f"  ✅ {name}: {len(df)} rows, {len(df.columns)} columns")
            except Exception as e:
                print(f"  ❌ Failed to load {filepath.name}: {e}")
        
        print(f"✅ Loaded {len(self.datasets)} datasets\n")
    
    def list_datasets(self) -> List[str]:
        """Return list of dataset names"""
        return list(self.datasets.keys())
    
    def get_summary(self) -> str:
        """Get lightweight summary of all datasets for LLM context"""
        summary = "Available Datasets:\n\n"
        for name, meta in self.datasets.items():
            summary += f"**{name}**\n"
            summary += f"  - Rows: {meta['rows']}\n"
            summary += f"  - Columns: {', '.join(meta['columns'])}\n\n"
        return summary
    
    def get_dataset_details(self, name: str) -> Optional[dict]:
        """Get full metadata for a specific dataset"""
        return self.datasets.get(name)
    
    def get_dataset_path(self, name: str) -> Optional[str]:
        """Get file path for a dataset"""
        meta = self.datasets.get(name)
        return meta['path'] if meta else None
    
    def to_json(self) -> str:
        """Export registry as JSON for LLM"""
        return json.dumps(self.datasets, indent=2)


# Global registry instance
_registry: Optional[DatasetRegistry] = None

def initialize_registry(data_dir: str):
    global _registry
    _registry = DatasetRegistry(data_dir)
    return _registry

def get_registry() -> DatasetRegistry:
    global _registry
    if _registry is None:
        raise RuntimeError("Registry not initialized")
    return _registry
