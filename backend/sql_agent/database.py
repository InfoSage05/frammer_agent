"""
database.py — CSV → In-Memory SQLite Loader

Reads all registered CSV datasets and loads them into a single in-memory
SQLite database so any SQL query can be run against them immediately.

Table naming rules:
  - Dataset name → sanitised: spaces/hyphens/dots/parentheses → underscore
  - Stored in `_table_map` dict: {original_name: table_name}
"""

import re
import sys
import logging
import pandas as pd

from pathlib import Path
from typing import Dict, List, Optional, Tuple
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine

# ── path bootstrap (works whether run standalone or imported) ─────────────────
_sql_agent_dir = Path(__file__).parent
_backend_dir = _sql_agent_dir.parent
_root_dir = _backend_dir.parent
for p in [str(_backend_dir), str(_root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

logger = logging.getLogger("sql_agent.database")

# ── module-level state ────────────────────────────────────────────────────────
_engine: Optional[Engine] = None
_table_map: Dict[str, str] = {}          # original dataset name → sql table name
_meta_map: Dict[str, dict] = {}          # table_name → {row_count, columns, original_name}


def _sanitise(name: str) -> str:
    """Convert a dataset name to a valid SQL table name."""
    s = re.sub(r"[^a-zA-Z0-9]", "_", name)
    s = re.sub(r"_+", "_", s).strip("_").lower()
    # Ensure it doesn't start with a digit
    if s and s[0].isdigit():
        s = "t_" + s
    return s or "dataset"


def init_db() -> Engine:
    """
    Load all registered CSV datasets into an in-memory SQLite engine.
    Safe to call multiple times — re-uses the existing engine.

    Returns:
        SQLAlchemy Engine connected to in-memory SQLite.
    """
    global _engine, _table_map, _meta_map

    if _engine is not None:
        return _engine

    # ── initialise registry ───────────────────────────────────────────────────
    from dataset_registry import get_registry, initialize_registry
    from config import DATASETS_DIR

    try:
        registry = get_registry()
    except RuntimeError:
        logger.info("Registry not initialised yet — initialising now from DATASETS_DIR")
        registry = initialize_registry(str(DATASETS_DIR))

    if not registry.datasets:
        logger.warning("Registry is empty — no datasets found.")

    # ── create in-memory SQLite ───────────────────────────────────────────────
    engine = create_engine("sqlite:///:memory:", echo=False)

    loaded = 0
    for original_name, meta in registry.datasets.items():
        table_name = _sanitise(original_name)
        # Avoid collisions
        if table_name in [v for v in _table_map.values()]:
            table_name = table_name + f"_{loaded}"

        try:
            df = pd.read_csv(meta["path"])
            # Sanitise column names too (SQLite is picky)
            df.columns = [_sanitise(c) for c in df.columns]

            df.to_sql(table_name, engine, index=False, if_exists="replace")

            _table_map[original_name] = table_name
            _meta_map[table_name] = {
                "original_name": original_name,
                "table_name": table_name,
                "row_count": len(df),
                "columns": df.columns.tolist(),
                "path": meta["path"],
            }
            loaded += 1
            logger.info(f"  ✅ '{original_name}' → table '{table_name}' ({len(df)} rows)")
        except Exception as e:
            logger.error(f"  ❌ Failed loading '{original_name}': {e}")

    logger.info(f"SQLite loaded — {loaded}/{len(registry.datasets)} datasets as tables")
    _engine = engine
    return _engine


def get_engine() -> Engine:
    """Return the initialised engine (auto-inits if needed)."""
    if _engine is None:
        return init_db()
    return _engine


def get_all_table_names() -> List[str]:
    """Return all SQL table names currently in the database."""
    engine = get_engine()
    inspector = inspect(engine)
    return inspector.get_table_names()


def get_table_meta(table_name: str) -> Optional[dict]:
    """Return metadata dict for a table, or None if not found."""
    return _meta_map.get(table_name)


def get_table_map() -> Dict[str, str]:
    """Return {original_dataset_name: sql_table_name} mapping."""
    return dict(_table_map)


def get_full_meta() -> Dict[str, dict]:
    """Return all metadata keyed by table_name."""
    return dict(_meta_map)


def resolve_table_name(user_name: str) -> Optional[str]:
    """
    Try to resolve a user-provided name (original dataset name or table name)
    to the actual SQL table name.

    Args:
        user_name: Could be 'monthly-chart', 'monthly_chart', or 'monthly chart'

    Returns:
        Exact SQL table name, or None if not found.
    """
    # Direct match on sql table name
    if user_name in _meta_map:
        return user_name
    # Direct match on original name
    if user_name in _table_map:
        return _table_map[user_name]
    # Fuzzy: sanitise and match
    sanitised = _sanitise(user_name)
    if sanitised in _meta_map:
        return sanitised
    # Case-insensitive search
    lower = user_name.lower()
    for orig, sql in _table_map.items():
        if lower in orig.lower() or lower in sql.lower():
            return sql
    return None


def run_raw_sql(sql: str) -> Tuple[List[dict], int]:
    """
    Execute a raw SQL SELECT and return (rows_as_dicts, count).
    Raises ValueError for non-SELECT statements.
    """
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT"):
        raise ValueError("Only SELECT queries are allowed.")

    engine = get_engine()
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        rows = [dict(row._mapping) for row in result]
    return rows, len(rows)
