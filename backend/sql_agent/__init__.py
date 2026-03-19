"""
sql_agent - LangGraph ReAct DBMS SQL Agentic System

A self-contained module that:
- Loads all CSV datasets into in-memory SQLite
- Exposes LangGraph ReAct agent with SQL tools
- Provides FastAPI router for frontend integration
"""

from .agent import run_sql_agent
from .database import init_db, get_engine, get_all_table_names

__all__ = [
    "run_sql_agent",
    "init_db",
    "get_engine",
    "get_all_table_names",
]
