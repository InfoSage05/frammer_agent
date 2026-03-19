"""
server.py — FastAPI Router for the SQL Agent

Mounts as a router on the main FastAPI app.
Can also be run standalone for testing (python -m backend.sql_agent.server).

Endpoints:
  GET  /sql/datasets           — list all tables (name, columns, row_count)
  GET  /sql/schema/{name}      — column info for one table
  GET  /sql/table/{name}       — full contents of a table (all rows as JSON)
  POST /sql/query              — run natural language or SQL query via agent
"""

import sys
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── path bootstrap ────────────────────────────────────────────────────────────
_sql_agent_dir = Path(__file__).parent
_backend_dir = _sql_agent_dir.parent
_root_dir = _backend_dir.parent
for p in [str(_backend_dir), str(_root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .database import (
    get_all_table_names,
    get_full_meta,
    get_table_meta,
    init_db,
    resolve_table_name,
    run_raw_sql,
)
from .agent import run_sql_agent

logger = logging.getLogger("sql_agent.server")

# ── Request / Response models ─────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    rows: List[Dict[str, Any]] = []
    sql_used: str = ""
    datasets_used: List[str] = []
    success: bool
    error: Optional[str] = None


class DatasetInfo(BaseModel):
    name: str
    table_name: str
    columns: List[str]
    row_count: int


class SchemaColumn(BaseModel):
    column: str
    dtype: str
    sample_values: List[Any] = []


class SchemaResponse(BaseModel):
    table_name: str
    original_name: str
    row_count: int
    schema: List[SchemaColumn]


# ── Router definition ─────────────────────────────────────────────────────────
router = APIRouter(prefix="/sql", tags=["SQL Agent"])


@router.get("/datasets", response_model=List[DatasetInfo])
def list_all_datasets():
    """
    List all available datasets with name, SQL table name, columns, and row count.
    This is the first thing to call to discover what data is available.
    """
    try:
        init_db()
        meta = get_full_meta()
        return [
            DatasetInfo(
                name=m["original_name"],
                table_name=m["table_name"],
                columns=m["columns"],
                row_count=m["row_count"],
            )
            for m in meta.values()
        ]
    except Exception as e:
        logger.error(f"/sql/datasets error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schema/{table_name}", response_model=SchemaResponse)
def get_table_schema(table_name: str):
    """
    Get column names and types for a specific dataset.
    Use the exact table_name from /sql/datasets.
    """
    try:
        init_db()
        resolved = resolve_table_name(table_name)
        if not resolved:
            raise HTTPException(
                status_code=404,
                detail=f"Table '{table_name}' not found. Call GET /sql/datasets to see available tables.",
            )
        meta = get_table_meta(resolved)

        import pandas as pd
        from .database import get_engine
        df = pd.read_sql(f'SELECT * FROM "{resolved}" LIMIT 10', get_engine())

        schema = [
            SchemaColumn(
                column=col,
                dtype=str(df[col].dtype),
                sample_values=df[col].dropna().tolist()[:3],
            )
            for col in df.columns
        ]

        return SchemaResponse(
            table_name=resolved,
            original_name=meta["original_name"] if meta else resolved,
            row_count=meta["row_count"] if meta else -1,
            schema=schema,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/sql/schema/{table_name} error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/table/{table_name}")
def get_full_table(table_name: str, limit: int = 1000):
    """
    Return all rows of a dataset as JSON.
    Use `limit` parameter to cap the result (default 1000 rows).
    """
    try:
        init_db()
        resolved = resolve_table_name(table_name)
        if not resolved:
            raise HTTPException(
                status_code=404,
                detail=f"Table '{table_name}' not found.",
            )
        meta = get_table_meta(resolved)
        rows, count = run_raw_sql(f'SELECT * FROM "{resolved}" LIMIT {int(limit)}')

        return {
            "table_name": resolved,
            "original_name": meta["original_name"] if meta else resolved,
            "total_rows": meta["row_count"] if meta else count,
            "returned_rows": count,
            "columns": list(rows[0].keys()) if rows else [],
            "rows": rows,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/sql/table/{table_name} error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query", response_model=QueryResponse)
def query_agent(request: QueryRequest):
    """
    Run a natural language or SQL question through the LangGraph ReAct SQL agent.

    The agent will:
    1. Discover available tables
    2. Examine relevant schemas
    3. Write and execute SQL queries
    4. Validate results are non-empty
    5. Return a natural language answer + raw rows

    Example body: {"query": "What are the top 5 users by video count?"}
    """
    logger.info(f"POST /sql/query: {request.query[:80]}")
    try:
        init_db()
        result = run_sql_agent(query=request.query, session_id=request.session_id)
        return QueryResponse(**result)
    except Exception as e:
        logger.error(f"/sql/query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Standalone mode ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv

    load_dotenv(_root_dir / ".env")

    from dataset_registry import initialize_registry
    from config import DATASETS_DIR

    initialize_registry(str(DATASETS_DIR))

    app = FastAPI(title="SQL Agent — Standalone Test Server")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    print("🚀 SQL Agent server running at http://localhost:8001")
    print("   GET  http://localhost:8001/sql/datasets")
    print("   POST http://localhost:8001/sql/query")
    uvicorn.run(app, host="0.0.0.0", port=8001)
