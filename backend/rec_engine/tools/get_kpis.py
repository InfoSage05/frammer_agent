"""
tools/get_kpis.py
=================
Tool 1 — Business KPI Fetcher
------------------------------
Reads the active KPI configuration from `data/kpis.json` and returns it
as a validated Pydantic model (serialised to a compact JSON string for the
LLM agent to consume).

Production swap-in points
--------------------------
* Replace `_load_from_file()` with an HTTP call to your internal KPI API:
      import httpx
      resp = httpx.get("https://internal-kpi-service/api/current")
      return KPIConfig(**resp.json())
* Or pull from a database table:
      SELECT * FROM kpi_config WHERE active = 1 ORDER BY updated_at DESC LIMIT 1
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Literal

from langchain_core.tools import tool
from pydantic import BaseModel, Field, model_validator

logger = logging.getLogger(__name__)

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class KPIObjective(BaseModel):
    """A single weighted business objective."""
    kpi:         str             = Field(description="Metric identifier, e.g. 'click_through_rate'")
    goal:        Literal["maximize", "minimize"] = Field(description="Optimisation direction")
    weight:      float           = Field(ge=0.0, le=1.0, description="Fraction of the composite score")
    description: str             = Field(description="Human-readable explanation for the agent")


class HardFilters(BaseModel):
    """Non-negotiable constraints applied before scoring."""
    min_inventory:        int        = Field(ge=0,  description="Items with fewer units are excluded")
    max_content_age_days: int        = Field(ge=1,  description="Items older than this are excluded")
    blocked_categories:   list[str]  = Field(default_factory=list, description="Fully excluded categories")


class KPIConfig(BaseModel):
    """Full KPI configuration returned to the agent."""
    active_campaign: str            = Field(description="Name of the running campaign")
    objectives:      list[KPIObjective]
    hard_filters:    HardFilters
    notes:           str            = Field(default="")

    @model_validator(mode="after")
    def _weights_sum_to_one(self) -> "KPIConfig":
        total = sum(obj.weight for obj in self.objectives)
        if not (0.99 <= total <= 1.01):
            raise ValueError(
                f"KPI objective weights must sum to 1.0; got {total:.3f}. "
                "Fix backend/rec_engine/data/kpis.json."
            )
        return self


# ─── File loader ──────────────────────────────────────────────────────────────

_KPI_FILE = Path(__file__).parent.parent / "data" / "kpis.json"


def _load_from_file() -> KPIConfig:
    """Load and validate kpis.json from disk."""
    if not _KPI_FILE.exists():
        raise FileNotFoundError(f"KPI config not found at {_KPI_FILE}")
    raw = json.loads(_KPI_FILE.read_text(encoding="utf-8"))
    return KPIConfig(**raw)


# ─── LangChain Tool ──────────────────────────────────────────────────────────

@tool
def get_kpis() -> str:
    """
    Retrieve the current active business KPIs (key performance indicators)
    that must guide the recommendation engine.

    Returns a JSON string with:
      - active_campaign  : name of the current marketing campaign
      - objectives       : list of {kpi, goal, weight, description} objects;
                           weights sum to 1.0
      - hard_filters     : mandatory constraints (min inventory, max age, blocked categories)
      - notes            : operator notes

    Call this tool FIRST before generating any recommendations so that your
    re-ranking logic reflects the latest business strategy.
    """
    logger.info("[Tool] get_kpis() called")
    config = _load_from_file()
    result = config.model_dump_json(indent=2)
    logger.debug("[Tool] get_kpis() returning %d bytes", len(result))
    return result
