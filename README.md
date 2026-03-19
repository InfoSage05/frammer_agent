# Frammer Agent 🤖

An agentic AI-powered data analysis assistant for Frammer AI's media publishing analytics platform.

---

## Pipeline Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          USER (Next.js Frontend)                             │
│             POST /chat  ──────────────────────────────────────               │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       FastAPI  (main_simple.py)                              │
│                                                                              │
│  1. Fetch session memory  (conversation_memory.py)                           │
│  2. Build conversation context  → last 5 turns                               │
│  3. Call  run_planner(query, context)  ──────────────────────────────────►  │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PLANNER  (planner.py)                               │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STEP 0 ─ Fast Classification  (no LLM)                             │   │
│   │                                                                      │   │
│   │   greeting? → handle_greeting()   →  fast LLM, return immediately  │   │
│   │   list data? → handle_list_data() →  DBMS, return immediately       │   │
│   │   describe?  → describe_data()    →  DBMS schema, return            │   │
│   └──────────────────────────┬──────────────────────────────────────────┘   │
│                              │ (analysis / visualization / complex)          │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 1 ─ Task Understanding   (llama-3.1-8b  fast)               │   │
│   │                                                                      │   │
│   │  • Parse query intent, extract datasets & columns needed            │   │
│   │  • Resolve pronouns with conversation context                       │   │
│   │  • Output: TaskPlan {datasets_needed, needs_code, complexity}       │   │
│   └──────────────────────────┬──────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 2 ─ Data Acquisition   (DBMS layer)                         │   │
│   │                                                                      │   │
│   │  list_datasets()  │  get_schema(name)  │  get_first_rows(name, n)  │   │
│   │  → SQLite-backed registry of all CSV datasets                       │   │
│   └──────────────────────────┬──────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 4 ─ Approach Planning   (llama-3.3-70b  thinking)           │   │
│   │                                                                      │   │
│   │  Runs for: complex / analysis / visualization tasks, OR when        │   │
│   │  conversation context is present.                                   │   │
│   │                                                                      │   │
│   │  • Inspect full schemas + 3-row preview of relevant datasets        │   │
│   │  • Choose chart type, axes, aggregation strategy                    │   │
│   │  • Output: natural-language execution plan                          │   │
│   └──────────────────────────┬──────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 5 ─ Code Generation   (llama-3.3-70b  thinking)             │   │
│   │                                                                      │   │
│   │  • Given schema + approach plan → generate Python analysis code     │   │
│   │  • Uses helper API: get_full_dataset(), create_chart(), RESULT      │   │
│   │  • Outputs: pure code body (no imports, no markdown)                │   │
│   └──────────────────────────┬──────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  PHASE 6 ─ Code Execution + Reflexion   (code_agent/executor.py)   │   │
│   │                                                                      │   │
│   │  execute_code_with_retry(code, max_retries=3)                       │   │
│   │                                                                      │   │
│   │  ┌───────────┐   fail   ┌──────────────────────────────────────┐   │   │
│   │  │  Run code │ ───────► │  Error Diagnosis (LLM reflexion)     │   │   │
│   │  │ subprocess│ ◄─────── │  Diagnose → patch → re-run (×3 max) │   │   │
│   │  └─────┬─────┘   retry  └──────────────────────────────────────┘   │   │
│   │        │ success                                                     │   │
│   │        ▼                                                             │   │
│   │  RESULT { charts[], tables[], summary, data }                       │   │
│   └──────────────────────────┬──────────────────────────────────────────┘   │
└──────────────────────────────┼───────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   FastAPI Response Assembly                                  │
│                                                                              │
│  • Store turn in ConversationMemory (datasets, charts, key findings)         │
│  • Generate contextual follow-up suggestions                                 │
│  • Return ChatResponse { response, session_id, artifacts[], suggestions[] } │
└──────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      Next.js Frontend renders                                │
│       KPI Cards  │  Recharts (bar/line/area/pie)  │  AI Chat Panel          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Startup: Analytics Engine

On every server start, the analytics engine runs **before** accepting requests:

```
startup()
  │
  ├── initialize_registry(DATA_DIR)
  │     Load all CSV files → DatasetRegistry (in-memory)
  │
  └── run_analytics()
        │
        ├── Detect changes  (hash check vs saved_analytics/)
        │     schema_changed / data_appended / unchanged
        │
        ├── [If changed] column_mapper.py
        │     LLM maps semantic names → actual CSV column names
        │     Saves column_mappings.json
        │
        ├── [If changed] script_generator.py
        │     LLM writes kpi_script.py + chart_data_script.py
        │
        ├── script_executor.py
        │     Run scripts → compute 14 KPIs + 6 chart datasets
        │
        └── Save analytics_dashboard.json → frontend/public/data/
```

---

## Features

- **📊 Multi-Tab Dashboard**: Overview KPIs, interactive charts (Recharts), data explorer
- **🤖 AI Chat Assistant**: Sliding panel, natural language → analysis → chart artifacts
- **🧠 Conditional Planning Pipeline**: 6 phases, only activated when needed (fast for simple queries)
- **💬 Conversation Memory**: Context-aware — resolves pronouns, references previous charts
- **🔄 Dataset-Agnostic**: No hardcoded column names — semantic column mapping via LLM at startup
- **⚡ Reflexion Loop**: Auto-diagnoses + patches code errors up to 3×
- **🔧 Modular LLM**: Fast model (8b) for routing/understanding, Thinking model (70b) for planning/codegen

---

## Directory Structure

```
gc26/
├── frontend/                       # Next.js 14 App
│   ├── src/app/
│   │   ├── layout.tsx
│   │   └── page.tsx                # Dashboard + AI chat panel
│   └── public/data/
│       └── analytics_dashboard.json  # Pre-computed KPIs + charts
│
├── backend/
│   ├── main_simple.py              # ← FastAPI server (run this)
│   ├── planner.py                  # 6-phase planning pipeline
│   ├── dataset_registry.py         # CSV loader, in-memory registry
│   ├── conversation_memory.py      # Session-aware turn storage
│   ├── analytics/
│   │   ├── analytics_engine.py     # Change detection + orchestration
│   │   ├── column_mapper.py        # LLM semantic → actual column mapping
│   │   ├── script_generator.py     # LLM writes KPI & chart scripts
│   │   └── script_executor.py      # Runs generated scripts safely
│   ├── code_agent/
│   │   └── executor.py             # Subprocess executor + reflexion loop
│   └── dbms/                       # Dataset query helpers
│
├── llm/
│   └── groq_client.py              # fast_complete (8b) / think_complete (70b)
│
├── config.py                       # Paths, model names, env vars
├── requirements.txt
└── .env                            # GROQ_API_KEY=...
```

---

## Quick Start

### 1. Create Conda Environment

```bash
conda create -n frammer_agent python=3.11 -y
conda activate frammer_agent
```

### 2. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure API Key

```bash
cp .env.example .env
# Edit .env and add: GROQ_API_KEY=your_key_here
```

Get a free Groq API key at: https://console.groq.com/

### 4. Add Your Data

Drop CSV files into `data/datasets/`. The analytics engine auto-detects them on startup.

### 5. Start Backend (Terminal 1)

```bash
cd backend
python main_simple.py
```

Server runs at `http://localhost:8000`

### 6. Start Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

UI opens at `http://localhost:3000`

---

## Example Queries

### Simple (no code, instant)
- "Hello" / "What can you do?"
- "What datasets do you have?"
- "Describe the monthly dataset"

### Analysis (full pipeline)
- "Show me monthly trends"
- "Compare top 5 channels by volume"
- "Which users have the highest publish rate?"

### Complex / Contextual
- "Now break that down by channel" *(uses conversation context)*
- "Forecast the next 3 months using the same data"
- "Plot channel efficiency (uploads per publish)"

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/chat` | POST | Main chat endpoint → response + chart artifacts |
| `/datasets` | GET | List all loaded datasets |
| `/metrics` | GET | All computed KPI metrics |
| `/kpi-summary` | GET | KPIs grouped by category |
| `/analytics-dashboard` | GET | Full dashboard (KPIs + chart data) |
| `/analytics-refresh` | POST | Force re-run analytics pipeline |
| `/charts/{filename}` | GET | Serve chart PNG |

---

## Troubleshooting

### Port already in use
```bash
lsof -ti :8000 | xargs kill -9
```

### "GROQ_API_KEY not set"
Create `.env` in the project root:
```
GROQ_API_KEY=your_key_here
```

### Charts not rendering
- Check `frontend/public/data/analytics_dashboard.json` exists
- Hit `/analytics-refresh` to force recompute
- Check browser console for Recharts errors

---

## License

MIT License
