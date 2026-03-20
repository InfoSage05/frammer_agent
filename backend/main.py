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

# ─── Hardcoded Section Data (Iteration 1: Overview) ─────────────────────────

OVERVIEW_DATA: Dict[str, Any] = {
    "meta": {
        "tag": "EXECUTIVE COMMAND CENTRE · MAR 2025 → FEB 2026",
        "title": "Executive Overview",
        "sub": "Platform performance at a glance — growth, red flags, and top-line KPIs. Audience: Founders · Leadership · Client Success.",
    },
    "monthlyData": [
        {"month": "Mar'25", "uploaded": 639, "created": 2555, "published": 0, "uploadedDur": 122.06, "createdDur": 176.28, "publishedDur": 0},
        {"month": "Apr'25", "uploaded": 533, "created": 1656, "published": 44, "uploadedDur": 65.47, "createdDur": 98.02, "publishedDur": 1.09},
        {"month": "May'25", "uploaded": 217, "created": 642, "published": 4, "uploadedDur": 46.95, "createdDur": 64.45, "publishedDur": 0.06},
        {"month": "Jun'25", "uploaded": 239, "created": 907, "published": 3, "uploadedDur": 47.18, "createdDur": 84.16, "publishedDur": 0.2},
        {"month": "Jul'25", "uploaded": 284, "created": 892, "published": 0, "uploadedDur": 33.62, "createdDur": 66.84, "publishedDur": 0},
        {"month": "Aug'25", "uploaded": 256, "created": 699, "published": 7, "uploadedDur": 39.94, "createdDur": 64.52, "publishedDur": 0.11},
        {"month": "Sep'25", "uploaded": 227, "created": 684, "published": 0, "uploadedDur": 34.35, "createdDur": 58.63, "publishedDur": 0},
        {"month": "Oct'25", "uploaded": 343, "created": 1046, "published": 10, "uploadedDur": 47.86, "createdDur": 94.29, "publishedDur": 0.25},
        {"month": "Nov'25", "uploaded": 353, "created": 943, "published": 2, "uploadedDur": 48.12, "createdDur": 83.38, "publishedDur": 0.04},
        {"month": "Dec'25", "uploaded": 194, "created": 644, "published": 7, "uploadedDur": 38.26, "createdDur": 71.7, "publishedDur": 0.24},
        {"month": "Jan'26", "uploaded": 492, "created": 1492, "published": 20, "uploadedDur": 121.99, "createdDur": 191.46, "publishedDur": 1.45},
        {"month": "Feb'26", "uploaded": 676, "created": 2756, "published": 14, "uploadedDur": 161.87, "createdDur": 301.51, "publishedDur": 0.94},
    ],
    "inputTypes": [
        {"type": "interview", "uploaded": 1299, "created": 4972, "published": 35, "uploadedH": 243.89, "createdH": 462.72},
        {"type": "news bulletin", "uploaded": 1026, "created": 3238, "published": 39, "uploadedH": 171.76, "createdH": 275.87},
        {"type": "special reports", "uploaded": 755, "created": 2129, "published": 15, "uploadedH": 133.01, "createdH": 197.85},
        {"type": "speech", "uploaded": 742, "created": 2390, "published": 12, "uploadedH": 132.69, "createdH": 217.79},
        {"type": "debate", "uploaded": 290, "created": 1074, "published": 5, "uploadedH": 63.69, "createdH": 98.29},
        {"type": "press conference", "uploaded": 280, "created": 973, "published": 2, "uploadedH": 51.11, "createdH": 85.44},
    ],
    "channels": [
        {"ch": "A", "uploaded": 847, "created": 3112, "published": 46, "uploadedH": 148.2, "platforms": {"Facebook": 1, "Instagram": 7, "Reels": 5, "Shorts": 1, "Youtube": 5}, "noPublish": False},
        {"ch": "B", "uploaded": 620, "created": 1982, "published": 7, "uploadedH": 117.8, "platforms": {}, "noPublish": False},
        {"ch": "C", "uploaded": 321, "created": 1080, "published": 1, "uploadedH": 68.2, "platforms": {}, "noPublish": False},
        {"ch": "D", "uploaded": 412, "created": 1430, "published": 72, "uploadedH": 78.5, "platforms": {"Facebook": 6, "Instagram": 3, "Reels": 15, "Shorts": 18, "Youtube": 29}, "noPublish": False},
    ],
    "totals": {
        "totalCreated": 15119,
        "totalUploaded": 4453,
        "totalPublished": 111,
        "publishRate": "2.5",
        "multiplier": "3.4",
        "activeChannels": 18,
    },
    "toasts": [
        {"text": "97.5% of processed content never gets published — 15,008 videos created but not distributed.", "tone": "crit", "title": "Critical Finding", "delay": 1800},
        {"text": "Feb 2026 peak: 2,756 outputs — 194% above monthly average.", "tone": "info", "title": "Momentum Signal", "delay": 4200},
    ],
    "contextStrip": [
        {"label": "UPLOAD PERIOD", "v": "Mar 2025 – Feb 2026", "sub": "12 months active"},
        {"label": "AI MULTIPLIER", "v": "3.4×", "sub": "inputs → AI outputs"},
        {"label": "TOP CHANNEL", "v": "Ch-D", "sub": "72 pub · 17.5% rate"},
        {"label": "PEAK MONTH", "v": "Feb '26", "sub": "2,756 outputs · +194%"},
        {"label": "PUBLISH GAP", "v": "97.5%", "sub": "15,008 never distributed"},
    ],
    "strategicSignals": [
        {"type": "crit", "tag": "⚠ CRITICAL", "num": "97.5%", "text": "of processed content never published.", "stat": "Created: 15,119 · Published: 111 · Gap: 15,008", "k": "c1"},
        {"type": "warn", "tag": "⚡ PATTERN", "num": "3", "text": "months had zero published output.", "stat": "Mar, Jul, Sep 2025 — operational bottleneck, not volume issue", "k": "c2"},
        {"type": "ok", "tag": "↑ MOMENTUM", "num": "2,756", "text": "outputs in Feb 2026 — all-time peak.", "stat": "Feb avg vs 937 monthly avg = +194% · growth confirmed", "k": "c3"},
    ],
    "monthlyChart": {"badge": "Feb ↑ +194%", "legend": [["Uploaded", "var(--gold)"], ["Published", "var(--green)"]]},
    "statusDonut": [{"label": "Unpublished", "value": 15008, "color": "#6a1818"}, {"label": "Published", "value": 111, "color": "#30b060"}],
}

TRENDS_DATA: Dict[str, Any] = {
    "meta": {
        "tag": "TEMPORAL ANALYSIS · MAR 2025 → FEB 2026",
        "title": "Usage & Trend Analysis",
        "sub": "How volumes trend over time — strongest periods, count vs duration, H1 vs H2.",
    },
    "monthlyData": OVERVIEW_DATA["monthlyData"],
    "metricOptions": [["count", "Count"], ["duration", "Duration"]],
    "timeOptions": [["all", "All 12 months"], ["h1", "H1 Mar–Aug"], ["h2", "H2 Sep–Feb"]],
    "compareToggle": "H1 vs H2 Overlay",
    "heatLegend": {"colors": ["#1a1614", "#4a2a08", "#7a4a10", "#b87514", "#d4952a", "#f0b84a"], "label": "Low → Peak creation"},
    "durationLegend": [["Upload hrs", "#d4952a"], ["Created hrs", "#e07038"], ["Published hrs", "#30b060"]],
}

MULTIDIM_DATA: Dict[str, Any] = {
    "meta": {"tag": "CHANNEL · USER · PLATFORM INTELLIGENCE", "title": "Channel & User Intelligence", "sub": "Compare channels, users, languages and input types."},
    "inputTypes": OVERVIEW_DATA["inputTypes"],
    "languages": [
        {"lang": "English", "uploaded": 2647, "created": 8861, "published": 91, "uploadedH": 437.5},
        {"lang": "Hindi", "uploaded": 1792, "created": 6021, "published": 20, "uploadedH": 366.56},
        {"lang": "Mixed", "uploaded": 11, "created": 29, "published": 0, "uploadedH": 2.51},
    ],
    "users": [
        {"user": "Chandan", "uploaded": 489, "created": 2152, "published": 19, "uploadedH": 100.73},
        {"user": "QA-Purushottam", "uploaded": 309, "created": 1227, "published": 13, "uploadedH": 33.15},
        {"user": "Nitesh", "uploaded": 224, "created": 959, "published": 0, "uploadedH": 59.96},
        {"user": "Neha", "uploaded": 158, "created": 510, "published": 10, "uploadedH": 20.19},
    ],
    "channelMetrics": [{"label": "A", "uploaded": 1470, "created": 4725, "published": 71}, {"label": "B", "uploaded": 1293, "created": 4251, "published": 19}, {"label": "D", "uploaded": 221, "created": 701, "published": 0}],
    "kpiOptions": [{"k": "uploaded", "l": "Uploaded"}, {"k": "created", "l": "Created"}, {"k": "published", "l": "Published"}, {"k": "pub_rate", "l": "Pub Rate"}],
    "viewOptions": [["bar", "Bar Chart"], ["heatmap", "Heatmap"], ["treemap", "Treemap"], ["ternary", "Ternary"]],
    "heatData": [{"input": "interview", "lang": "English", "val": 892}, {"input": "interview", "lang": "Hindi", "val": 407}, {"input": "news bulletin", "lang": "English", "val": 620}, {"input": "news bulletin", "lang": "Hindi", "val": 406}],
    "treemapColors": ["#b87514", "#c45e22", "#a87850", "#7a6858", "#5a7868", "#9b7058"],
    "ternaryDatasets": {
        "channels": [{"label": "A", "uploaded": 1470, "created": 4725, "published": 71}, {"label": "B", "uploaded": 1293, "created": 4251, "published": 19}, {"label": "D", "uploaded": 221, "created": 701, "published": 0}],
        "users": [{"label": "Chandan", "uploaded": 489, "created": 2152, "published": 19}, {"label": "QA-Purushottam", "uploaded": 309, "created": 1227, "published": 13}, {"label": "Nitesh", "uploaded": 224, "created": 959, "published": 0}],
        "inputtypes": [{"label": "interview", "uploaded": 1299, "created": 4972, "published": 35}, {"label": "news bulletin", "uploaded": 1026, "created": 3238, "published": 39}],
    },
    "ternaryAxisOptions": {"dataset": [["channels", "Channels"], ["users", "Users"], ["inputtypes", "Input types"]], "common": ["uploaded", "created", "published", "pub_rate", "multiplier"], "right": ["created", "uploaded", "published", "pub_rate", "multiplier"]},
}

FUNNEL_DATA: Dict[str, Any] = {
    "meta": {"tag": "CONTENT MIX & PUBLISHING FUNNEL", "title": "Content Mix & Publishing Funnel", "sub": "Where publish drop-off occurs and conversion by channel/type."},
    "subTabs": [["sankey", "Sankey Flow"], ["pipeline", "Pipeline"], ["channels", "By Channel"], ["types", "By Type"]],
    "sankeyTypeOptions": [["funnel", "Upload→Publish"], ["channel", "Channel→Platform"], ["content", "Content→Language"]],
    "inputTypes": OVERVIEW_DATA["inputTypes"],
    "languages": MULTIDIM_DATA["languages"],
    "channels": OVERVIEW_DATA["channels"],
    "totals": {"totalUploaded": 4453, "totalCreated": 15119, "totalPublished": 111, "publishRate": "2.5", "multiplier": "3.4"},
    "contentFlowLegend": [{"c": "var(--ink3)", "l": "Uploaded: 4,453"}, {"c": "var(--gold)", "l": "AI Created: 15,119 (3.4×)"}, {"c": "var(--green)", "l": "Published: 111 (2.5%)"}],
    "dataQualityAlerts": [{"t": "🔴 Team attribution: 99.3% rows have Unknown team", "c": "crit"}, {"t": "🔴 Platform NULL: 68% published items have no platform", "c": "crit"}],
    "typeTreemapColors": ["#b87514", "#c45e22", "#a87850", "#7a6858", "#5a7868", "#9b7058"],
    "sankey": {
        "funnel": {"nodes": ["Uploads", "AI Created", "Published", "Unpublished"], "links": [{"source": "Uploads", "target": "AI Created", "value": 4453}, {"source": "AI Created", "target": "Published", "value": 111}, {"source": "AI Created", "target": "Unpublished", "value": 14803}]},
        "channel": {"nodes": ["Ch-A", "Ch-D", "YouTube", "Reels", "Shorts"], "links": [{"source": "Ch-A", "target": "YouTube", "value": 5}, {"source": "Ch-D", "target": "YouTube", "value": 29}, {"source": "Ch-D", "target": "Reels", "value": 15}]},
        "content": {"nodes": ["Interview", "News bulletin", "Published (111)"], "links": [{"source": "Interview", "target": "Published (111)", "value": 35}, {"source": "News bulletin", "target": "Published (111)", "value": 39}]},
    },
}

EXPLORER_DATA: Dict[str, Any] = {
    "meta": {"tag": "VIDEO EXPLORER & DATA QUALITY", "title": "Data Explorer & Quality Diagnostics", "sub": "User rankings, drilldowns and data quality checks."},
    "subTabs": [["users", "User Rankings"], ["channels", "Channel Drilldown"], ["quality", "Data Quality"], ["kpi_tree", "KPI Framework"], ["d3tree", "Hierarchy Tree"], ["advanced_kpi", "Advanced KPI"]],
    "userSortOptions": [["created", "Created"], ["published", "Published"], ["uploaded", "Uploaded"]],
    "users": MULTIDIM_DATA["users"],
    "languages": MULTIDIM_DATA["languages"],
    "inputTypes": OVERVIEW_DATA["inputTypes"],
    "channelMetrics": MULTIDIM_DATA["channelMetrics"],
    "platformNames": ["YouTube", "Reels", "Shorts", "Facebook", "Instagram"],
    "platformHeatmap": [{"channel": "Ch-A", "values": [5, 5, 1, 1, 7]}, {"channel": "Ch-D", "values": [29, 15, 18, 6, 3]}],
    "dataQualityRows": [
        {"l": "Missing Values by Field", "v": "28.1%", "c": "var(--red-lt)", "severity": "critical", "detail": "Team/platform fields have major gaps.", "pct": 28},
        {"l": "\"Unknown\" Buckets", "v": "99.3%", "c": "var(--red-lt)", "severity": "critical", "detail": "Team attribution is mostly unknown.", "pct": 99},
    ],
    "completenessRings": [{"label": "Field Coverage", "pct": 72, "color": "var(--amber)", "size": 68}, {"label": "ID Integrity", "pct": 84, "color": "var(--amber)", "size": 54}, {"label": "URL Validity", "pct": 32, "color": "var(--red)", "size": 54}],
    "hierarchyOptions": {"root": [["channel", "Channel"], ["inputtype", "Input type"], ["language", "Language"]], "child": [["user", "User"], ["channel", "Channel"], ["inputtype", "Input type"]], "metric": [["cr", "Created"], ["up", "Uploaded"], ["pb", "Published"]]},
    "kpiTree": {"name": "Frammer KPI Framework", "type": "root", "children": [{"name": "[A] Usage & Adoption", "type": "category", "color": "#d4952a", "children": [{"name": "Total Platform Volume", "formula": "SUM(Uploaded)", "value": "4,453", "critical": False, "avail": "direct"}, {"name": "Total AI Outputs Created", "formula": "SUM(Created)", "value": "15,119", "critical": False, "avail": "direct"}]}]},
}

CLIENT_DATA: Dict[str, Any] = {
    "meta": {"tag": "CLIENT OVERVIEW", "badge": "EXPLICIT ACCESS ONLY", "title": "Client Profile", "sub": "Anonymized client dataset · Mar 2025 – Feb 2026"},
    "summaryCards": [{"l": "Client ID", "v": "[Anon]", "c": "var(--ink)", "icon": "◎"}, {"l": "Active Channels", "v": "18", "c": "var(--gold-lt)", "icon": "◉"}, {"l": "Active Users", "v": "44 / 45", "c": "var(--ink2)", "icon": "⊹"}, {"l": "Dataset Period", "v": "12 months", "c": "var(--amber)", "icon": "⊳"}],
    "pipelineSummary": [{"l": "Total Uploaded", "v": "4,453", "pct": 100, "color": "var(--ink3)"}, {"l": "Total Processed", "v": "15,119", "pct": 100, "color": "var(--gold)"}, {"l": "Total Published", "v": "111", "pct": 2.5, "color": "var(--amber)"}, {"l": "Publish Rate", "v": "2.5%", "pct": 2.5, "color": "var(--red)"}, {"l": "AI Multiplier", "v": "3.4×", "pct": 85, "color": "var(--gold-lt)"}],
    "keySignals": [{"type": "crit", "tag": "⚠ CRITICAL — PUBLISH GAP", "text": "97.5% of AI-created outputs were never distributed."}, {"type": "warn", "tag": "⚡ DATA QUALITY", "text": "99.3% unknown team names · 68% NULL platform on published rows."}, {"type": "ok", "tag": "✓ GROWTH SIGNAL", "text": "Feb 2026 created 2,756 outputs — strong upward trajectory."}],
    "channels": OVERVIEW_DATA["channels"],
}


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


@app.get("/data/overview")
async def get_overview_data():
    """Hardcoded overview section payload (temporary)."""
    return OVERVIEW_DATA


@app.get("/data/trends")
async def get_trends_data():
    """Hardcoded trends section payload (temporary)."""
    return TRENDS_DATA


@app.get("/data/multidim")
async def get_multidim_data():
    """Hardcoded multidim section payload (temporary)."""
    return MULTIDIM_DATA


@app.get("/data/funnel")
async def get_funnel_data():
    """Hardcoded funnel section payload (temporary)."""
    return FUNNEL_DATA


@app.get("/data/explorer")
async def get_explorer_data():
    """Hardcoded explorer section payload (temporary)."""
    return EXPLORER_DATA


@app.get("/data/client")
async def get_client_data():
    """Hardcoded client section payload (temporary)."""
    return CLIENT_DATA


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
