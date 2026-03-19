"""
tools/query_dataset.py
======================
Tool 2 — Dataset / Metadata Fetcher
-------------------------------------
Given a list of candidate item IDs and a user ID, queries the seeded
SQLite database and returns:
  - Item-level metadata (name, category, price, margin_pct, inventory,
    avg_ctr, listed_days_ago)
  - A per-item `user_history_score` — how strongly this user has
    interacted with this item (0.0 if never interacted)

The results are returned as a compact JSON string so the agent can
reason about each field.

Production swap-in points
--------------------------
* Replace `get_db_engine()` with a real PostgreSQL / BigQuery connection.
* Add a Redis/Memcached cache layer in front of the SQL call to reduce
  latency on hot user-item pairs.
* Extend the user_history_score formula to incorporate recency-weighting,
  e.g. exponential decay on interaction timestamp.
"""

from __future__ import annotations

import json
import logging
from typing import Annotated

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from ..data.seed_data import get_db_engine

logger = logging.getLogger(__name__)

# ─── Pydantic Schema ─────────────────────────────────────────────────────────

class ItemMeta(BaseModel):
    """Single-item metadata record returned to the agent."""
    item_id:             str
    name:                str
    category:            str
    price:               float
    margin_pct:          float   = Field(description="Gross margin as a percentage 0-100")
    inventory:           int     = Field(description="Units currently in stock")
    avg_ctr:             float   = Field(description="Average click-through rate 0-1")
    listed_days_ago:     int     = Field(description="Days since the item was listed")
    user_history_score:  float   = Field(
        description=(
            "Normalised 0-1 score indicating how much this user has interacted "
            "with this item. 0.0 = no history, 1.0 = maximum engagement."
        )
    )


# ─── SQL helpers ─────────────────────────────────────────────────────────────

_ITEM_QUERY = """
SELECT
    i.item_id,
    i.name,
    i.category,
    i.price,
    i.margin_pct,
    i.inventory,
    i.avg_ctr,
    i.listed_days_ago
FROM items i
WHERE i.item_id IN ({placeholders})
"""

_HISTORY_QUERY = """
SELECT
    item_id,
    AVG(rating) AS mean_rating,
    COUNT(*)    AS interaction_count
FROM interactions
WHERE user_id = :user_id
  AND item_id IN ({placeholders})
GROUP BY item_id
"""

_MAX_RATING = 5.0


def _build_placeholders(ids: list[str]) -> tuple[str, dict]:
    """Build named SQL placeholders for a list of IDs (SQLite safe)."""
    params = {f"id_{i}": v for i, v in enumerate(ids)}
    placeholders = ", ".join(f":{k}" for k in params)
    return placeholders, params


# ─── LangChain Tool ──────────────────────────────────────────────────────────

@tool
def query_dataset(item_ids: list[str], user_id: str) -> str:
    """
    Pull item metadata and user-specific history scores from the database
    for the given list of candidate item IDs.

    Parameters
    ----------
    item_ids : list[str]
        Candidate item IDs returned by get_model_recommendations().
        Limit to the 50 candidates to keep the context window manageable.
    user_id  : str
        The ID of the user requesting recommendations (e.g. "user_042").

    Returns
    -------
    str
        A JSON array of objects, each containing:
          item_id, name, category, price, margin_pct, inventory,
          avg_ctr, listed_days_ago, user_history_score.
        Use these fields along with the KPIs from get_kpis() to re-rank.
    """
    logger.info("[Tool] query_dataset(user_id=%s, n_items=%d)", user_id, len(item_ids))

    if not item_ids:
        return json.dumps([])

    # Cap at 50 to avoid blowing the context window
    item_ids = item_ids[:50]

    engine = get_db_engine()
    placeholders, id_params = _build_placeholders(item_ids)

    from sqlalchemy import text

    with engine.connect() as conn:
        # ── Fetch item metadata ────────────────────────────────────────────────
        item_rows = conn.execute(
            text(_ITEM_QUERY.format(placeholders=placeholders)),
            id_params,
        ).mappings().all()

        # ── Fetch user interaction history for these items ─────────────────────
        history_rows = conn.execute(
            text(_HISTORY_QUERY.format(placeholders=placeholders)),
            {"user_id": user_id, **id_params},
        ).mappings().all()

    # Build a lookup: item_id → history data
    history_map: dict[str, dict] = {
        row["item_id"]: {
            "mean_rating":        row["mean_rating"],
            "interaction_count":  row["interaction_count"],
        }
        for row in history_rows
    }

    # ── Assemble final records ─────────────────────────────────────────────────
    results: list[ItemMeta] = []
    for row in item_rows:
        hist = history_map.get(row["item_id"])
        if hist:
            # Normalise: mean_rating/5 * log1p(count) capped at 1
            import math
            raw_score = (hist["mean_rating"] / _MAX_RATING) * math.log1p(hist["interaction_count"])
            user_history_score = min(round(raw_score, 4), 1.0)
        else:
            user_history_score = 0.0

        results.append(
            ItemMeta(
                item_id            = row["item_id"],
                name               = row["name"],
                category           = row["category"],
                price              = row["price"],
                margin_pct         = row["margin_pct"],
                inventory          = row["inventory"],
                avg_ctr            = row["avg_ctr"],
                listed_days_ago    = row["listed_days_ago"],
                user_history_score = user_history_score,
            )
        )

    output = json.dumps([r.model_dump() for r in results], indent=2)
    logger.debug("[Tool] query_dataset() returning %d items (%d bytes)", len(results), len(output))
    return output
