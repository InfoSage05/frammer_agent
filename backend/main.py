"""
FastAPI Backend - Main API server for Frammer Agent.
Provides endpoints for chat, data management, and artifacts.
"""
import os
import sys
import json
import asyncio
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

# Add parent directory (gc26) to path for imports FIRST
_backend_dir = Path(__file__).parent
_agent_dir = _backend_dir.parent
_project_dir = _agent_dir.parent
sys.path.insert(0, str(_project_dir))

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = _agent_dir / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv(_project_dir / ".env", override=True)

# Import config to set up logging
from config import setup_logging, LOG_FILE

# Set up logger
logger = logging.getLogger("frammer.api")
logger.info(f"Logging to: {LOG_FILE}")

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

# Configuration with fallbacks
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
DATA_DIR = os.getenv("FRAMMER_DATA_DIR", str(_project_dir))
CHART_CATEGORIES = {}

# Lazy imports for optional modules
_bootstrap_imported = False
_registry_imported = False
_agent_imported = False

def _import_modules():
    """Lazy import of heavy modules."""
    global _bootstrap_imported, _registry_imported, _agent_imported
    
    if not _bootstrap_imported:
        try:
            # Use relative imports within backend
            from session import run_bootstrap, get_bootstrap
            globals()['run_bootstrap'] = run_bootstrap
            globals()['get_bootstrap'] = get_bootstrap
            _bootstrap_imported = True
        except Exception as e:
            print(f"Bootstrap import error: {e}")
            globals()['run_bootstrap'] = lambda: {"datasets_loaded": 0, "metrics_loaded": 0, "charts_found": 0, "errors": [str(e)]}
            globals()['get_bootstrap'] = lambda: None
            _bootstrap_imported = True
    
    if not _registry_imported:
        try:
            from context_manager import get_registry
            globals()['get_registry'] = get_registry
            _registry_imported = True
        except Exception as e:
            print(f"Registry import error: {e}")
            # Create a dummy registry
            class DummyRegistry:
                def list_datasets(self): return []
                def get_dataset(self, id): return None
                def get_sample(self, id, limit=10): raise ValueError("Not available")
                def get_metrics(self, category=None): return []
                def get_schema_summary(self): return ""
            globals()['get_registry'] = lambda: DummyRegistry()
            _registry_imported = True
    
    if not _agent_imported:
        try:
            # Use new orchestrator
            from orchestrator.graph_new import run_agent
            globals()['run_agent'] = run_agent
            _agent_imported = True
        except Exception as e:
            print(f"Agent import error: {e}")
            async def dummy_agent(query, session_id, conversation_history=None):
                # Fallback: Use LLM directly
                try:
                    llm_dir = _agent_dir / "llm"
                    sys.path.insert(0, str(llm_dir))
                    from groq_client import fast_complete
                    response = fast_complete(
                        [{"role": "user", "content": query}],
                        system_prompt="You are a helpful data analyst assistant."
                    )
                    return {"response": response, "artifacts": [], "suggestions": []}
                except Exception as llm_err:
                    return {"response": f"Agent not available: {e}. LLM error: {llm_err}", "artifacts": [], "suggestions": []}
            globals()['run_agent'] = dummy_agent
            _agent_imported = True


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    _import_modules()
    
    # Startup: Run bootstrap
    print("🚀 Starting Frammer Agent...")
    try:
        result = run_bootstrap()
        print(f"✅ Bootstrap complete: {result['datasets_loaded']} datasets, {result['metrics_loaded']} metrics")
        if result.get("errors"):
            print(f"⚠️ Warnings: {result['errors']}")
    except Exception as e:
        print(f"⚠️ Bootstrap error: {e}")
    yield
    # Shutdown
    print("👋 Shutting down Frammer Agent...")


# ─── App Initialization ──────────────────────────────────────────────────────

app = FastAPI(
    title="Frammer Agent API",
    description="Agentic AI backend for data analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (for demo; use Redis in production)
sessions: Dict[str, Dict[str, Any]] = {}


# ─── Request/Response Models ─────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    artifacts: List[Dict[str, Any]] = []
    suggestions: List[str] = []


class DatasetInfo(BaseModel):
    id: int
    name: str
    row_count: int
    col_count: int
    description: str


class MetricInfo(BaseModel):
    name: str
    value: float
    formatted: str
    category: str


# ─── Health Check ────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "frammer-agent"}


# ─── Chat Endpoints ──────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message and return response with artifacts.
    """
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"📨 Chat request: '{request.message[:100]}...' (session: {session_id[:8]})")
    
    # Get or create session
    if session_id not in sessions:
        sessions[session_id] = {"history": []}
    
    session = sessions[session_id]
    
    try:
        # Ensure modules are imported
        _import_modules()
        
        # Run agent
        logger.info("🤖 Running agent...")
        result = await run_agent(
            query=request.message,
            session_id=session_id,
            conversation_history=session["history"]
        )
        
        logger.info(f"✅ Agent response: {len(result.get('response', ''))} chars, {len(result.get('artifacts', []))} artifacts")
        
        # Update session history
        session["history"].append({"role": "user", "content": request.message})
        session["history"].append({"role": "assistant", "content": result["response"]})
        
        # Keep history bounded
        if len(session["history"]) > 20:
            session["history"] = session["history"][-20:]
        
        return ChatResponse(
            response=result["response"],
            session_id=session_id,
            artifacts=result.get("artifacts", []),
            suggestions=result.get("suggestions", [])
        )
        
    except Exception as e:
        logger.exception(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat/stream")
async def chat_stream(
    message: str = Query(...),
    session_id: Optional[str] = Query(None)
):
    """
    Stream chat response using Server-Sent Events.
    """
    session_id = session_id or str(uuid.uuid4())
    
    if session_id not in sessions:
        sessions[session_id] = {"history": []}
    
    session = sessions[session_id]
    
    async def event_generator():
        try:
            # Send session ID first
            yield {"event": "session", "data": json.dumps({"session_id": session_id})}
            
            # Build messages for streaming
            messages = session["history"] + [{"role": "user", "content": message}]
            
            # Try to use LLM streaming
            try:
                llm_dir = _agent_dir / "llm"
                sys.path.insert(0, str(llm_dir))
                from groq_client import stream_fast
                full_response = ""
                async for token in stream_fast(messages, system_prompt="You are a helpful data analyst."):
                    full_response += token
                    yield {"event": "token", "data": json.dumps({"token": token})}
            except Exception as llm_error:
                full_response = f"LLM not available: {llm_error}"
                yield {"event": "token", "data": json.dumps({"token": full_response})}
            
            # Update history
            session["history"].append({"role": "user", "content": message})
            session["history"].append({"role": "assistant", "content": full_response})
            
            yield {"event": "done", "data": json.dumps({"complete": True})}
            
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"error": str(e)})}
    
    return EventSourceResponse(event_generator())


# ─── Dataset Endpoints ───────────────────────────────────────────────────────

@app.get("/datasets")
async def list_datasets():
    """List all registered datasets."""
    _import_modules()
    try:
        registry = get_registry()
        datasets = registry.list_datasets()
        return {"datasets": datasets}
    except Exception as e:
        return {"datasets": [], "error": str(e)}


@app.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: int):
    """Get dataset details including schema."""
    _import_modules()
    try:
        registry = get_registry()
        dataset = registry.get_dataset(dataset_id)
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        return dataset
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/datasets/{dataset_id}/sample")
async def get_dataset_sample(
    dataset_id: int,
    limit: int = Query(10, ge=1, le=100)
):
    """Get sample rows from a dataset."""
    _import_modules()
    try:
        registry = get_registry()
        df = registry.get_sample(dataset_id, limit=limit)
        return {
            "columns": list(df.columns),
            "data": df.to_dict(orient="records"),
            "total_rows": len(df)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = None
):
    """Upload and register a new dataset."""
    try:
        tools_dir = _agent_dir / "tools"
        sys.path.insert(0, str(tools_dir))
        from file_ingest import ingest_uploaded_bytes
        content = await file.read()
        
        result = ingest_uploaded_bytes(
            content=content,
            filename=file.filename,
            name=name
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Metrics Endpoints ───────────────────────────────────────────────────────

@app.get("/metrics")
async def get_metrics(category: Optional[str] = None):
    """Get all computed metrics/KPIs."""
    _import_modules()
    try:
        registry = get_registry()
        metrics = registry.get_metrics(category=category)
        return {"metrics": metrics}
    except Exception as e:
        return {"metrics": [], "error": str(e)}


@app.get("/kpi-summary")
async def get_kpi_summary():
    """Get KPI summary for dashboard."""
    _import_modules()
    try:
        # Prefer analytics engine
        from analytics.analytics_engine import get_engine
        return get_engine().get_kpi_summary()
    except Exception:
        # Fallback to existing bootstrap
        try:
            bootstrap = get_bootstrap()
            if bootstrap:
                return bootstrap.get_kpi_summary()
        except Exception:
            pass
        return {"metrics": [], "by_category": {}, "count": 0}


# ─── Analytics Dashboard Endpoints ──────────────────────────────────────────

@app.get("/analytics-dashboard")
async def get_analytics_dashboard():
    """Get the complete analytics dashboard (KPIs + chart data + chart list)."""
    _import_modules()
    try:
        from analytics.analytics_engine import get_engine
        return get_engine().get_dashboard()
    except Exception as e:
        logger.exception(f"Analytics dashboard error: {e}")
        return {"metrics": [], "by_category": {}, "count": 0, "chart_data": {}, "charts": {}, "error": str(e)}


@app.post("/analytics-refresh")
async def refresh_analytics(force: bool = True):
    """Force re-check of dataset hashes and recompute changed analytics."""
    _import_modules()
    try:
        from analytics.analytics_engine import run_analytics
        result = run_analytics(force=force)
        return {
            "status": "refreshed",
            "change_type": result.get("change_type", "unknown"),
            "kpis_recomputed": result.get("kpis_recomputed", []),
            "from_cache": result.get("from_cache", False),
            "metrics_count": result.get("count", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Charts Endpoints ────────────────────────────────────────────────────────

@app.get("/charts")
async def get_charts():
    """Get all available charts organized by category."""
    _import_modules()
    try:
        bootstrap = get_bootstrap()
        if bootstrap:
            return {"charts": bootstrap.get_charts_by_category()}
        return {"charts": {}}
    except Exception as e:
        return {"charts": {}, "error": str(e)}


@app.get("/charts/list")
async def list_charts():
    """List all chart files."""
    try:
        tools_dir = _agent_dir / "tools"
        sys.path.insert(0, str(tools_dir))
        from chart_renderer import list_existing_charts
        charts = list_existing_charts()
        return {"charts": charts}
    except Exception as e:
        # Fallback: scan directory
        charts = []
        chart_dir = Path(DATA_DIR)
        if chart_dir.exists():
            for f in chart_dir.glob("*.png"):
                charts.append({"filename": f.name, "path": str(f)})
        return {"charts": charts}


@app.get("/charts/{filename}")
async def get_chart(filename: str):
    """Get a specific chart file."""
    chart_path = Path(DATA_DIR) / filename
    
    if not chart_path.exists():
        raise HTTPException(status_code=404, detail="Chart not found")
    
    return FileResponse(
        path=str(chart_path),
        media_type="image/png",
        filename=filename
    )


@app.get("/charts/{filename}/base64")
async def get_chart_base64(filename: str):
    """Get chart as base64 encoded data."""
    try:
        tools_dir = _agent_dir / "tools"
        sys.path.insert(0, str(tools_dir))
        from chart_renderer import load_existing_chart
        chart = load_existing_chart(filename)
        
        if not chart:
            raise HTTPException(status_code=404, detail="Chart not found")
        
        return chart
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Schema Endpoints ────────────────────────────────────────────────────────

@app.get("/schema-summary")
async def get_schema_summary():
    """Get natural language schema summary for all datasets."""
    _import_modules()
    try:
        registry = get_registry()
        summary = registry.get_schema_summary()
        return {"summary": summary}
    except Exception as e:
        return {"summary": "", "error": str(e)}


# ─── Session Management ──────────────────────────────────────────────────────

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session history."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return sessions[session_id]


@app.delete("/sessions/{session_id}")
async def clear_session(session_id: str):
    """Clear session history."""
    if session_id in sessions:
        del sessions[session_id]
    return {"status": "cleared"}


# ─── Run Server ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print(f"Starting server on {API_HOST}:{API_PORT}")
    print(f"Data directory: {DATA_DIR}")
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=True
    )
