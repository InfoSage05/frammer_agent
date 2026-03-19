"""
test_rec_engine.py
==================
End-to-end dry-run test for the Hybrid Agentic Recommendation Engine.

Run from the project root:
    python test_rec_engine.py

Tests (in order):
  1. Data seeding — SQLite row counts + ChromaDB vector count
  2. get_kpis()  — tool output structure
  3. get_model_recommendations() — returns valid candidates
  4. query_dataset() — enriches candidates with metadata
  5. Full agent invocation — produces a "Top 5" final answer

All tests use assert statements; a passing run prints "ALL TESTS PASSED".
"""

from __future__ import annotations

import json
import sys
import time

# ─── Helpers ─────────────────────────────────────────────────────────────────

def section(title: str):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")

def ok(msg: str):
    print(f"  ✅  {msg}")

def fail(msg: str):
    print(f"  ❌  {msg}")
    sys.exit(1)

# ─── Test 1: Data Seeding ─────────────────────────────────────────────────────

section("TEST 1 — Data seeding (SQLite + ChromaDB)")

t0 = time.time()
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from rec_engine.data.seed_data import get_db_engine, get_chroma_collection
from sqlalchemy import text

engine = get_db_engine()
with engine.connect() as conn:
    n_users        = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
    n_items        = conn.execute(text("SELECT COUNT(*) FROM items")).scalar()
    n_interactions = conn.execute(text("SELECT COUNT(*) FROM interactions")).scalar()

assert n_users        == 200,  f"Expected 200 users, got {n_users}"
assert n_items        == 500,  f"Expected 500 items, got {n_items}"
assert n_interactions == 2000, f"Expected 2000 interactions, got {n_interactions}"
ok(f"SQLite: {n_users} users | {n_items} items | {n_interactions} interactions")

collection, model = get_chroma_collection()
n_vectors = collection.count()
assert n_vectors == 500, f"Expected 500 ChromaDB vectors, got {n_vectors}"
ok(f"ChromaDB: {n_vectors} item vectors")
ok(f"Seeding completed in {time.time()-t0:.1f}s")

# ─── Test 2: get_kpis ────────────────────────────────────────────────────────

section("TEST 2 — get_kpis()")

# Invoke the raw function (bypassing LangChain tool wrapper)
from rec_engine.tools.get_kpis import get_kpis, _load_from_file

config = _load_from_file()
assert len(config.objectives) >= 1, "KPI config must have at least one objective"
assert abs(sum(o.weight for o in config.objectives) - 1.0) < 0.01, "Weights must sum to 1.0"
assert config.hard_filters.min_inventory >= 0

ok(f"Campaign: '{config.active_campaign}'")
ok(f"Objectives: {[o.kpi for o in config.objectives]}")
ok(f"Hard filters: {config.hard_filters.model_dump()}")

# Also test the LangChain @tool invocation
result_json = get_kpis.invoke({})
parsed = json.loads(result_json)
assert "objectives" in parsed
ok("LangChain @tool invocation succeeded")

# ─── Test 3: get_model_recommendations ───────────────────────────────────────

section("TEST 3 — get_model_recommendations(user_id='user_001', top_n=50)")

from rec_engine.tools.get_model_recommendations import get_model_recommendations

t0 = time.time()
raw = get_model_recommendations.invoke({"user_id": "user_001", "top_n": 50})
parsed = json.loads(raw)

assert "method"     in parsed, "Response must have 'method' key"
assert "candidates" in parsed, "Response must have 'candidates' key"
assert len(parsed["candidates"]) >= 1, "Must return at least 1 candidate"
assert "item_id"          in parsed["candidates"][0]
assert "similarity_score" in parsed["candidates"][0]

ok(f"Method: {parsed['method']}")
ok(f"Candidates returned: {len(parsed['candidates'])} (in {time.time()-t0:.1f}s)")
ok(f"Top candidate: {parsed['candidates'][0]}")

# Cold-start user test
raw_cold = get_model_recommendations.invoke({"user_id": "user_999", "top_n": 10})
parsed_cold = json.loads(raw_cold)
assert parsed_cold["method"] == "popularity_fallback"
ok("Cold-start user (user_999) correctly triggers popularity_fallback")

# ─── Test 4: query_dataset ───────────────────────────────────────────────────

section("TEST 4 — query_dataset()")

from rec_engine.tools.query_dataset import query_dataset

item_ids = [c["item_id"] for c in parsed["candidates"][:20]]
raw_meta = query_dataset.invoke({"item_ids": item_ids, "user_id": "user_001"})
items_meta = json.loads(raw_meta)

assert len(items_meta) >= 1, "Must return at least one item"
required_keys = {"item_id","name","category","price","margin_pct",
                 "inventory","avg_ctr","listed_days_ago","user_history_score"}
for item in items_meta:
    missing = required_keys - set(item.keys())
    assert not missing, f"Missing keys: {missing} in item {item.get('item_id')}"

ok(f"Metadata returned for {len(items_meta)} items")
ok(f"All required keys present: {sorted(required_keys)}")
ok(f"Sample: {items_meta[0]}")

# ─── Test 5: Full Agent Invocation ───────────────────────────────────────────

section("TEST 5 — Full agent invocation (user_042)")

from rec_engine.agent.orchestrator import run_recommendation_agent

print("  Invoking agent (may take 10-30s for LLM + tool calls)…")
t0 = time.time()

final_output = run_recommendation_agent("user_042", stream=False)

elapsed = time.time() - t0
print(f"\n{'·'*60}")
print(final_output)
print(f"{'·'*60}\n")

assert final_output, "Agent returned empty output"
lower = final_output.lower()
has_top5    = "top 5" in lower or "top-5" in lower or "recommendation" in lower
has_item    = "item_" in lower
assert has_top5, "Final output should mention 'Top 5' or 'recommendation'"
assert has_item, "Final output should contain at least one item ID"

ok(f"Agent completed in {elapsed:.1f}s")
ok("Output contains 'Top 5' or 'recommendation' ✓")
ok("Output contains item IDs ✓")

# ─── Summary ─────────────────────────────────────────────────────────────────

print(f"\n{'='*60}")
print("  🎉  ALL TESTS PASSED")
print(f"{'='*60}\n")
