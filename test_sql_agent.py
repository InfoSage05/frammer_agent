"""
test_sql_agent.py — Standalone Test for the SQL Agentic System

Run from project root:
    cd /Users/ashishsharma/Documents/GitHub/gc26
    source .venv/bin/activate
    python test_sql_agent.py

Tests:
  1. Registry initialisation
  2. SQLite loading (database.py)
  3. list_datasets tool
  4. get_schema tool
  5. run_sql_query tool (valid + invalid)
  6. get_full_dataset tool
  7. Full agent end-to-end: "list all datasets"
  8. Full agent end-to-end: SQL analytic query
"""

import sys
import json
import traceback
import importlib
from pathlib import Path

# ── path setup ────────────────────────────────────────────────────────────────
# We add BACKEND to sys.path so 'sql_agent' is importable as a package.
# We do NOT import via 'backend.sql_agent' because backend/__init__.py has
# broken legacy imports (frammer_agent) unrelated to this module.
ROOT = Path(__file__).parent
BACKEND = ROOT / "backend"

sys.path.insert(0, str(BACKEND))   # makes 'sql_agent' importable as a package
sys.path.insert(0, str(ROOT))      # makes 'config', 'dataset_registry' importable

# ── env ───────────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

# ── registry ──────────────────────────────────────────────────────────────────
from dataset_registry import initialize_registry
from config import DATASETS_DIR

PASS = "✅"
FAIL = "❌"
SEP  = "─" * 60

passed = 0
failed = 0
tables = []
first_table = "monthly_chart"


def check(label: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        print(f"{PASS}  {label}")
        passed += 1
    else:
        print(f"{FAIL}  {label}")
        if detail:
            print(f"     ↳ {detail}")
        failed += 1


def section(title: str):
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Registry
# ─────────────────────────────────────────────────────────────────────────────
section("1. Registry Initialisation")

try:
    registry = initialize_registry(str(DATASETS_DIR))
    n = len(registry.datasets)
    check(f"Registry loaded {n} datasets", n > 0, f"DATASETS_DIR={DATASETS_DIR}")
except Exception as e:
    check("Registry initialisation", False, str(e))
    sys.exit(1)  # Fatal — nothing else will work

# ─────────────────────────────────────────────────────────────────────────────
# 2. SQLite Loading
# ─────────────────────────────────────────────────────────────────────────────
section("2. SQLite Database Loading")

try:
    from sql_agent.database import init_db, get_all_table_names, get_full_meta

    engine = init_db()
    tables = get_all_table_names()
    meta = get_full_meta()
    first_table = tables[0] if tables else "monthly_chart"

    check("Engine created", engine is not None)
    check(f"Tables loaded: {len(tables)}", len(tables) > 0)
    check("Metadata populated", len(meta) == len(tables), f"{len(meta)} meta vs {len(tables)} tables")

    print(f"\n  Tables in SQLite:")
    for t in tables:
        m = meta.get(t, {})
        col_preview = ", ".join(m.get("columns", [])[:4])
        if len(m.get("columns", [])) > 4:
            col_preview += "..."
        print(f"    - {t}  ({m.get('row_count', '?')} rows)  cols: {col_preview}")

except Exception as e:
    check("SQLite loading", False, str(e))
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# 3. list_datasets tool
# ─────────────────────────────────────────────────────────────────────────────
section("3. list_datasets Tool")

try:
    from sql_agent.tools import list_datasets

    raw = list_datasets.invoke("")
    data = json.loads(raw)

    check("list_datasets returns valid JSON list", isinstance(data, list))
    check(f"list_datasets count = {len(data)}", len(data) > 0)
    if data:
        first = data[0]
        check("Each item has 'name' field", "name" in first)
        check("Each item has 'table_name' field", "table_name" in first)
        check("Each item has 'columns' field", isinstance(first.get("columns"), list))
        check("Each item has 'row_count' field", isinstance(first.get("row_count"), int))

except Exception as e:
    check("list_datasets tool", False, str(e))
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# 4. get_schema tool
# ─────────────────────────────────────────────────────────────────────────────
section("4. get_schema Tool")

try:
    from sql_agent.tools import get_schema

    raw = get_schema.invoke(first_table)
    data = json.loads(raw)

    check(f"get_schema '{first_table}' returns dict", isinstance(data, dict))
    check("Contains 'schema' key", "schema" in data)
    if "schema" in data:
        check(f"Schema has {len(data['schema'])} columns", len(data["schema"]) > 0)
        print(f"\n  Columns in '{first_table}': {[col['column'] for col in data['schema']]}")

except Exception as e:
    check("get_schema tool", False, str(e))
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# 5. run_sql_query tool
# ─────────────────────────────────────────────────────────────────────────────
section("5. run_sql_query Tool")

try:
    from sql_agent.tools import run_sql_query

    # Valid SELECT
    sql_ok = f'SELECT * FROM "{first_table}" LIMIT 5'
    raw = run_sql_query.invoke(sql_ok)
    data = json.loads(raw)
    check("Valid SELECT returns valid=True", data.get("valid") is True, str(data.get("error")))
    check(f"Returns rows (count={data.get('count')})", data.get("count", 0) > 0)

    # COUNT query
    sql_count = f'SELECT COUNT(*) as total FROM "{first_table}"'
    raw2 = run_sql_query.invoke(sql_count)
    data2 = json.loads(raw2)
    check("COUNT(*) query succeeds", data2.get("valid") is True)

    # Invalid: non-SELECT
    raw3 = run_sql_query.invoke("DROP TABLE test")
    data3 = json.loads(raw3)
    check("DROP TABLE blocked (valid=False)", data3.get("valid") is False)

    # Invalid: empty
    raw4 = run_sql_query.invoke("")
    data4 = json.loads(raw4)
    check("Empty query rejected", data4.get("valid") is False)

except Exception as e:
    check("run_sql_query tool", False, str(e))
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# 6. get_full_dataset tool
# ─────────────────────────────────────────────────────────────────────────────
section("6. get_full_dataset Tool")

try:
    from sql_agent.tools import get_full_dataset

    raw = get_full_dataset.invoke(first_table)
    data = json.loads(raw)

    check("get_full_dataset returns dict", isinstance(data, dict))
    check("Contains 'rows' key", "rows" in data)
    check("Contains 'row_count' key", "row_count" in data)
    check(f"Row count > 0 ({data.get('row_count')})", data.get("row_count", 0) > 0)

except Exception as e:
    check("get_full_dataset tool", False, str(e))
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# 7. Full Agent — "list all datasets"
# ─────────────────────────────────────────────────────────────────────────────
section("7. Agent E2E — 'list all datasets'")

run_sql_agent = None
try:
    from sql_agent.agent import run_sql_agent

    result = run_sql_agent("List all available datasets and their column names.")
    answer = result.get("answer", "")

    check("Agent returns success=True", result.get("success") is True, str(result.get("error")))
    check("Answer is non-empty string", bool(answer and len(answer) > 10))

    print(f"\n  Agent answer (preview):")
    print(f"  {answer[:400]}{'...' if len(answer) > 400 else ''}")

except Exception as e:
    check("Agent E2E (list datasets)", False, str(e))
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# 8. Full Agent — Analytic SQL Query
# ─────────────────────────────────────────────────────────────────────────────
section("8. Agent E2E — Analytic Query")

try:
    if run_sql_agent is None:
        from sql_agent.agent import run_sql_agent

    result2 = run_sql_agent(
        "How many rows are in each dataset? Show a table with dataset name and row count."
    )
    answer2 = result2.get("answer", "")

    check("Agent returns success=True", result2.get("success") is True, str(result2.get("error")))
    check("Answer is non-empty", bool(answer2 and len(answer2) > 10))
    # Agent may answer via list_datasets metadata OR via SQL — both are correct
    has_data = bool(result2.get("sql_used") or result2.get("rows") or result2.get("datasets_used"))
    check("Agent used tools to answer", has_data)

    print(f"\n  Agent answer (preview):")
    print(f"  {answer2[:400]}{'...' if len(answer2) > 400 else ''}")

except Exception as e:
    check("Agent E2E (analytic query)", False, str(e))
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
section("Summary")
total = passed + failed
print(f"  Passed : {passed}/{total}")
print(f"  Failed : {failed}/{total}")
if failed == 0:
    print(f"\n  {PASS}  All tests passed — SQL Agent is working correctly!")
else:
    print(f"\n  {FAIL}  {failed} test(s) failed — see details above.")
print()
