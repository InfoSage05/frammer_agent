"""
Main FastAPI server with simple architecture - FIXED VERSION

FIXES APPLIED:
✓ Move session memory import to module level (avoid per-request overhead)
✓ Optimize imports for async operations
✓ Clear RAG endpoint documentation
✓ Separate concerns between Chat and Ask AI endpoints
"""
import sys
from pathlib import Path

# Setup paths FIRST - before any local imports
_backend_dir = Path(__file__).parent
sys.path.insert(0, str(_backend_dir))  # For backend modules (dataset_registry, planner, etc.)
sys.path.insert(0, str(_backend_dir.parent))  # For project root (config, llm)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import os
import uuid
from datetime import datetime
import logging
import json
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Setup logging
log_dir = Path(__file__).parent.parent / "logs"
log_dir.mkdir(exist_ok=True)

# Clear old logs
for old_log in log_dir.glob("backend_*.log"):
    old_log.unlink()

log_file = log_dir / f"backend_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize app
app = FastAPI(
    title="Frammer AI Agent",
    description="Intelligent data analysis and RAG-powered AI assistant",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Module-Level Imports (Optimization Fix) ────────────────────────────────
# Import session memory here once instead of per-request
try:
    from conversation_memory import get_session_memory
    logger.debug("✅ Session memory module loaded on startup")
except ImportError as e:
    logger.error(f"Failed to import session memory: {e}")
    raise

# ─── SQL Agent Router ──────────────────────────────────────────────────────────
try:
    from sql_agent.server import router as sql_router
    app.include_router(sql_router)
    logger.info("✅ SQL Agent router mounted at /sql/*")
except Exception as _sql_err:
    logger.warning(f"⚠️  SQL Agent router not loaded: {_sql_err}")

# ─── Request/Response Models ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Chat endpoint request - orchestrator-based analytics"""
    message: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    """Chat endpoint response with artifacts and suggestions"""
    response: str
    session_id: str
    artifacts: list[dict] = []
    suggestions: list[str] = []
    progress: list[str] = []  # Progress messages from orchestrator

class AskAIRequest(BaseModel):
    """
    RAG Ask AI endpoint request - retrieval-augmented generation
    
    This endpoint:
    - Retrieves relevant context from datasets via semantic search
    - Uses ChromaDB for vector similarity
    - Returns Groq LLM-generated answers with data context
    """
    question: str
    session_id: str | None = None
    use_thinking_model: bool = False

class AskAIResponse(BaseModel):
    """
    RAG Ask AI endpoint response with context metadata
    
    Fields:
    - answer: Generated response from Groq LLM
    - session_id: Session tracking ID
    - context_size: Number of context tokens used
    - datasets_referenced: Which datasets provided context
    """
    answer: str
    session_id: str
    context_size: int
    datasets_referenced: list[str]

# ─── Startup and Health Checks ────────────────────────────────────────────────

from dataset_registry import initialize_registry
from config import DATASETS_DIR

@app.on_event("startup")
async def startup():
    """Initialize all services on application startup"""
    logger.info("🚀 Starting Frammer AI Agent...")
    logger.info(f"📁 Data directory: {DATASETS_DIR}")

    # Initialize dataset registry
    registry = initialize_registry(DATASETS_DIR)
    logger.info(f"✅ Loaded {len(registry.datasets)} datasets")

    # Log dataset summary
    for name, meta in registry.datasets.items():
        logger.info(f"  - {name}: {meta['rows']} rows, {len(meta['columns'])} cols")

    # Run analytics pipeline (detects changes, maps columns, computes KPIs)
    try:
        from analytics.analytics_engine import run_analytics
        result = run_analytics()
        change = result.get("change_type", "unknown")
        cached = result.get("from_cache", False)
        count = result.get("count", 0)
        if cached:
            logger.info(f"📊 Analytics: {count} metrics loaded from cache")
        else:
            logger.info(f"📊 Analytics: {count} metrics computed (change_type={change})")
    except Exception as e:
        logger.warning(f"⚠️ Analytics engine failed: {e}")

    # Initialize RAG pipeline
    try:
        from rag_pipeline import get_rag_pipeline
        rag = get_rag_pipeline()
        logger.info("✅ RAG pipeline initialized (semantic search indexed)")
    except Exception as e:
        logger.warning(f"⚠️ RAG pipeline initialization failed: {e}")

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/datasets")
async def list_datasets():
    """List all available datasets with metadata"""
    from dataset_registry import get_registry
    registry = get_registry()
    return {
        "datasets": [
            {
                "name": name,
                "rows": meta["rows"],
                "columns": meta["columns"]
            }
            for name, meta in registry.datasets.items()
        ]
    }

# ─── Analytics Endpoints ─────────────────────────────────────────────────────

@app.get("/metrics")
async def get_metrics():
    """Get all computed KPI metrics. Frontend KPICards.tsx calls this."""
    try:
        from analytics.analytics_engine import get_engine
        dashboard = get_engine().get_dashboard()
        return {"metrics": dashboard.get("metrics", [])}
    except Exception as e:
        logger.warning(f"Metrics endpoint error: {e}")
        return {"metrics": []}


@app.get("/kpi-summary")
async def get_kpi_summary():
    """Get KPI summary grouped by category."""
    try:
        from analytics.analytics_engine import get_engine
        return get_engine().get_kpi_summary()
    except Exception as e:
        return {"metrics": [], "by_category": {}, "count": 0}


@app.get("/analytics-dashboard")
async def get_analytics_dashboard():
    """Get the complete analytics dashboard (KPIs + chart data + chart list).
    This single endpoint gives the frontend everything it needs."""
    try:
        from analytics.analytics_engine import get_engine
        return get_engine().get_dashboard()
    except Exception as e:
        logger.error(f"Analytics dashboard error: {e}")
        return {"metrics": [], "by_category": {}, "count": 0, "chart_data": {}, "charts": {}}


@app.post("/analytics-refresh")
async def refresh_analytics():
    """Force re-check datasets and recompute analytics."""
    try:
        from analytics.analytics_engine import run_analytics
        result = run_analytics(force=True)
        return {
            "status": "refreshed",
            "change_type": result.get("change_type", "unknown"),
            "kpis_recomputed": result.get("kpis_recomputed", []),
            "from_cache": result.get("from_cache", False),
            "metrics_count": result.get("count", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/charts/{filename}")
async def get_chart(filename: str):
    """Serve a chart PNG file. Frontend loads these as <img> src."""
    from fastapi.responses import FileResponse
    from config import DATA_DIR
    chart_path = Path(DATA_DIR) / filename
    if not chart_path.exists():
        raise HTTPException(status_code=404, detail="Chart not found")
    return FileResponse(path=str(chart_path), media_type="image/png", filename=filename)


# ─── Chat Endpoint (Orchestrator-based Analytics) ──────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint using Master Orchestrator
    
    Features:
    - Automated agent routing (code, SQL, analytics)
    - Dataset selection and analysis
    - Chart generation
    - Multi-turn conversation tracking
    
    Args:
        message: User query
        session_id: Optional session ID for multi-turn conversations
        
    Returns:
        Response with artifacts, charts, and suggestions
    """
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"Chat request: {request.message[:100]}... (session: {session_id[:8]})")
    
    try:
        # Get session memory (module-level import for efficiency)
        session_memory = get_session_memory(session_id)
        
        # Get conversation context for the orchestrator
        conversation_context = session_memory.get_context_for_llm(include_last_n=5)
        
        # Run Master Orchestrator
        from orchestrator.master import run_orchestrator
        result = run_orchestrator(
            query=request.message,
            session_id=session_id,
            conversation_context=conversation_context
        )
        
        response_text = result.get("response", "")
        artifacts = result.get("artifacts", [])
        suggestions = result.get("suggestions", [])
        datasets_used = result.get("datasets_used", [])
        progress = result.get("progress_messages", [])
        
        # Extract key findings from response
        key_findings = []
        if response_text:
            first_sentence = response_text.split('.')[0]
            if len(first_sentence) > 10:
                key_findings.append(first_sentence)
        
        # Extract chart titles
        charts_created = []
        for artifact in artifacts:
            if artifact.get("type") == "chart" and artifact.get("title"):
                charts_created.append(artifact["title"])
        
        # Store this turn in memory
        session_memory.add_turn(
            user_query=request.message,
            assistant_response=response_text,
            datasets_used=datasets_used,
            charts_created=charts_created,
            key_findings=key_findings
        )
        
        logger.info(f"Response: {len(response_text)} chars, {len(artifacts)} artifacts")
        
        return ChatResponse(
            response=response_text,
            session_id=session_id,
            artifacts=artifacts,
            suggestions=suggestions,
            progress=progress
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─── RAG Ask AI Endpoint (Retrieval-Augmented Generation) ────────────────────────

@app.post("/ask-ai", response_model=AskAIResponse)
async def ask_ai(request: AskAIRequest):
    """
    Ask AI endpoint - Retrieval-Augmented Generation with Groq LLM
    
    Pipeline:
    1. Semantic search retrieval from ChromaDB
    2. Context formatting from relevant datasets
    3. LLM generation via Groq API
    4. Fallback to database search if semantic fails
    
    Features:
    - Fast model for quick answers (llama-3.1-8b-instant)
    - Thinking model for complex analysis (llama-3.3-70b-versatile)
    - Auto-retry with exponential backoff
    - Session context integration
    - Metadata about context used
    
    Args:
        question: User question to answer from data
        session_id: Optional session ID for conversation tracking
        use_thinking_model: Use larger reasoning model instead of fast model
        
    Returns:
        Answer with context metrics and datasets referenced
        
    Example:
        POST /ask-ai
        {
            "question": "What was the top performing channel last month?",
            "session_id": "abc123",
            "use_thinking_model": false
        }
        
        Response:
        {
            "answer": "Instagram was the top performing channel with...",
            "session_id": "abc123",
            "context_size": 2048,
            "datasets_referenced": ["channel-wise-publishing.csv"]
        }
    """
    session_id = request.session_id or str(uuid.uuid4())
    logger.info(f"Ask AI request: {request.question[:100]}... (session: {session_id[:8]})")
    
    try:
        # Get session memory (module-level import for efficiency)
        session_memory = get_session_memory(session_id)
        conversation_context = session_memory.get_context_for_llm(include_last_n=3)
        
        # Run RAG pipeline
        from rag_pipeline import get_rag_pipeline
        rag = get_rag_pipeline()
        
        result = rag.ask(
            query=request.question,
            conversation_history=conversation_context,
            use_thinking_model=request.use_thinking_model
        )
        
        answer = result.get("response", "")
        datasets_referenced = result.get("datasets_referenced", [])
        
        # Store in session memory
        session_memory.add_turn(
            user_query=request.question,
            assistant_response=answer,
            datasets_used=datasets_referenced,
            charts_created=[],
            key_findings=[answer.split('.')[0] if answer else ""]
        )
        
        logger.info(f"Ask AI Response: {len(answer)} chars, {len(datasets_referenced)} datasets referenced")
        
        return AskAIResponse(
            answer=answer,
            session_id=session_id,
            context_size=result.get("context_size", 0),
            datasets_referenced=datasets_referenced
        )
        
    except Exception as e:
        logger.error(f"Ask AI error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─── Helper Functions ────────────────────────────────────────────────────────

def generate_followup_suggestions(
    query: str, 
    datasets_used: list, 
    charts_created: list, 
    session_memory
) -> list:
    """Generate contextual follow-up suggestions based on conversation"""
    suggestions = []
    
    # Based on what we just analyzed
    if datasets_used:
        ds = datasets_used[0]
        if "user" in ds.lower():
            suggestions.append("Show me the bottom 5 users")
            suggestions.append("Compare this with the previous month")
        elif "channel" in ds.lower():
            suggestions.append("Which channel has the highest growth?")
            suggestions.append("Show channel-wise monthly trend")
        elif "month" in ds.lower():
            suggestions.append("Forecast the next 3 months")
            suggestions.append("Which month had the highest activity?")
    
    # Based on chart created
    if charts_created:
        if any("bar" in c.lower() for c in charts_created):
            suggestions.append("Sort this data differently")
            suggestions.append("Show me the trend over time")
        elif any("line" in c.lower() for c in charts_created):
            suggestions.append("Highlight the peak months")
            suggestions.append("Compare with last year's trend")
    
    return suggestions[:3]  # Return top 3


# ─── Main Execution ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
