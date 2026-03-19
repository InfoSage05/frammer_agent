"""
backend/rec_engine/main.py
===========================
CLI Entry-Point — Hybrid Agentic Recommendation Engine
-------------------------------------------------------
Run from the project root:

    python -m backend.rec_engine.main --user_id user_042

Or with a custom top-n candidate count:
    python -m backend.rec_engine.main --user_id user_042 --top_n 30

The agent will stream its reasoning steps (tool calls + intermediate results)
and finish with a formatted Top-5 recommendation table.

FastAPI Router (optional)
--------------------------
Import `rec_engine_router` into your FastAPI app to expose an HTTP endpoint:

    from backend.rec_engine.main import rec_engine_router
    app.include_router(rec_engine_router, prefix="/api/recommendations")
"""

from __future__ import annotations

import argparse
import logging
import sys

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from rec_engine.agent.orchestrator import run_recommendation_agent
from rec_engine.data.seed_data import get_db_engine, get_chroma_collection

# ─── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt = "%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── FastAPI Router (optional integration) ───────────────────────────────────

rec_engine_router = APIRouter(tags=["Recommendation Engine"])


class RecommendationRequest(BaseModel):
    user_id: str
    top_n: int = 50


@rec_engine_router.post("/")
async def get_recommendations(request: RecommendationRequest):
    """
    POST /api/recommendations
    Body: { "user_id": "user_042", "top_n": 50 }

    Returns a streaming response of agent reasoning + final recommendations.
    """
    def _stream():
        for chunk in run_recommendation_agent(request.user_id, stream=True):
            yield chunk

    return StreamingResponse(_stream(), media_type="text/plain")


@rec_engine_router.get("/health")
async def health():
    """Lightweight health check — verifies data stores are reachable."""
    try:
        engine = get_db_engine()
        from sqlalchemy import text
        with engine.connect() as conn:
            n_items = conn.execute(text("SELECT COUNT(*) FROM items")).scalar()

        collection, _ = get_chroma_collection()
        n_vectors = collection.count()

        return {
            "status":       "ok",
            "sqlite_items": n_items,
            "chroma_items": n_vectors,
        }
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


# ─── CLI Entry-Point ─────────────────────────────────────────────────────────

def _parse_args():
    parser = argparse.ArgumentParser(
        description = "Hybrid Agentic Recommendation Engine — CLI runner",
        formatter_class = argparse.RawDescriptionHelpFormatter,
        epilog = """
Examples:
  python -m backend.rec_engine.main --user_id user_042
  python -m backend.rec_engine.main --user_id user_001 --no-stream
        """,
    )
    parser.add_argument(
        "--user_id",
        required = True,
        help     = "User ID to generate recommendations for (e.g. user_042)",
    )
    parser.add_argument(
        "--no-stream",
        action  = "store_true",
        default = False,
        help    = "Disable streaming; wait for complete output before printing",
    )
    return parser.parse_args()


def main():
    args = _parse_args()

    print(f"\n{'='*60}")
    print(f"  Hybrid Agentic Recommendation Engine")
    print(f"  User: {args.user_id}")
    print(f"{'='*60}\n")

    # Eagerly seed data stores (no-op if already seeded due to lru_cache)
    logger.info("Initialising data stores…")
    get_db_engine()
    get_chroma_collection()

    stream = not args.no_stream

    if stream:
        print("── Streaming agent reasoning ──────────────────────────────\n")
        for chunk in run_recommendation_agent(args.user_id, stream=True):
            print(chunk, end="", flush=True)
    else:
        print("── Waiting for complete response… ──────────────────────────")
        result = run_recommendation_agent(args.user_id, stream=False)
        print(result)

    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    main()
