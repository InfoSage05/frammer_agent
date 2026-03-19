"""
tools.py — LangChain Tool Definitions for the SQL Agent

4 tools the ReAct agent can call:
  1. list_datasets      — enumerate all available tables with shape info
  2. get_schema         — column names + dtypes for a given table
  3. run_sql_query      — execute a SELECT, validate, return rows as JSON
  4. get_full_dataset   — SELECT * for a named table (convenience)
"""

import json
import logging
import re
from typing import Any

from langchain_core.tools import tool

from .database import (
    get_engine,
    get_all_table_names,
    get_full_meta,
    get_table_meta,
    resolve_table_name,
    run_raw_sql,
)

logger = logging.getLogger("sql_agent.tools")

# ── Dangerous SQL patterns to block ──────────────────────────────────────────
_BLOCKED = re.compile(
    r"\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|REPLACE|PRAGMA)\b",
    re.IGNORECASE,
)


def _validate_sql(sql: str) -> str | None:
    """
    Validate a SQL string.
    Returns an error message string if invalid, None if OK.
    """
    sql = sql.strip()
    if not sql:
        return "SQL query is empty."
    if not sql.upper().startswith("SELECT"):
        return "Only SELECT queries are permitted."
    if _BLOCKED.search(sql):
        return "Query contains forbidden keywords (DROP/DELETE/INSERT etc.)."
    return None


@tool
def list_datasets(_: str = "") -> str:
    """
    List all available datasets/tables loaded into the SQL database.

    Returns JSON array of objects: [{name, table_name, columns, row_count}].
    Use this FIRST to discover what data is available before writing SQL.
    """
    try:
        meta = get_full_meta()
        result = [
            {
                "name": v["original_name"],
                "table_name": v["table_name"],
                "columns": v["columns"],
                "row_count": v["row_count"],
            }
            for v in meta.values()
        ]
        logger.info(f"list_datasets → {len(result)} datasets")
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        logger.error(f"list_datasets error: {e}")
        return json.dumps({"error": str(e)})


@tool
def get_schema(table_name: str) -> str:
    """
    Get the column names and data types for a specific dataset/table.

    Args:
        table_name: The SQL table name (use list_datasets to find it).

    Returns JSON array: [{column, dtype, sample_values}]
    """
    try:
        resolved = resolve_table_name(table_name)
        if not resolved:
            tables = get_all_table_names()
            return json.dumps({
                "error": f"Table '{table_name}' not found.",
                "available_tables": tables,
            })

        meta = get_table_meta(resolved)
        engine = get_engine()

        import pandas as pd
        df = pd.read_sql(f"SELECT * FROM \"{resolved}\" LIMIT 5", engine)

        schema = []
        for col in df.columns:
            schema.append({
                "column": col,
                "dtype": str(df[col].dtype),
                "sample_values": df[col].dropna().tolist()[:3],
            })

        logger.info(f"get_schema '{resolved}' → {len(schema)} columns")
        return json.dumps({
            "table_name": resolved,
            "original_name": meta["original_name"] if meta else resolved,
            "row_count": meta["row_count"] if meta else "?",
            "schema": schema,
        }, ensure_ascii=False, default=str)
    except Exception as e:
        logger.error(f"get_schema error: {e}")
        return json.dumps({"error": str(e)})


@tool
def run_sql_query(sql: str) -> str:
    """
    Execute a SQL SELECT query against the in-memory database and return results.

    IMPORTANT RULES:
    - Only SELECT statements are allowed
    - Use exact table names from list_datasets
    - Column names are sanitised (spaces → underscores, lowercase)
    - Always add LIMIT clause for large tables (e.g. LIMIT 100)

    Args:
        sql: A valid SELECT SQL statement.

    Returns JSON: {sql, rows, count, valid, error (if any)}
    """
    error = _validate_sql(sql)
    if error:
        return json.dumps({"sql": sql, "valid": False, "error": error, "rows": [], "count": 0})

    try:
        rows, count = run_raw_sql(sql)
        valid = count > 0

        if not valid:
            logger.warning(f"SQL returned 0 rows: {sql[:80]}")
        else:
            logger.info(f"SQL OK: {count} rows — {sql[:80]}")

        # Truncate extremely large payloads
        serialised = json.dumps(rows, ensure_ascii=False, default=str)
        if len(serialised) > 50_000:
            rows = rows[:200]
            serialised = json.dumps(rows, ensure_ascii=False, default=str)
            note = f"Result truncated to 200 rows (total: {count})"
        else:
            note = None

        return json.dumps({
            "sql": sql,
            "valid": valid,
            "count": count,
            "rows": rows,
            "note": note,
        }, ensure_ascii=False, default=str)
    except Exception as e:
        logger.error(f"run_sql_query error: {e} | sql={sql[:80]}")
        return json.dumps({"sql": sql, "valid": False, "error": str(e), "rows": [], "count": 0})


@tool
def get_full_dataset(table_name: str) -> str:
    """
    Retrieve the complete contents of a dataset as JSON.

    Args:
        table_name: Dataset name or SQL table name (use list_datasets to find exact name).

    Returns JSON: {table_name, row_count, columns, rows}
    """
    try:
        resolved = resolve_table_name(table_name)
        if not resolved:
            tables = get_all_table_names()
            return json.dumps({
                "error": f"Table '{table_name}' not found.",
                "available_tables": tables,
            })

        rows, count = run_raw_sql(f'SELECT * FROM "{resolved}"')
        meta = get_table_meta(resolved)

        logger.info(f"get_full_dataset '{resolved}' → {count} rows")
        return json.dumps({
            "table_name": resolved,
            "original_name": meta["original_name"] if meta else resolved,
            "row_count": count,
            "columns": list(rows[0].keys()) if rows else [],
            "rows": rows,
        }, ensure_ascii=False, default=str)
    except Exception as e:
        logger.error(f"get_full_dataset error: {e}")
        return json.dumps({"error": str(e)})


# ── Convenience export ────────────────────────────────────────────────────────
ALL_TOOLS = [list_datasets, get_schema, run_sql_query, get_full_dataset]
