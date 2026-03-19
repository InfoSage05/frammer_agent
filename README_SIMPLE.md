# Frammer AI Agent - Simplified Architecture

## Overview
A full-stack agentic AI system for data analysis with a clean React frontend and Python backend.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER QUERY                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                  ┌─────────────────────┐
                  │  Planning Agent     │
                  │  (ReAct Loop)       │
                  │  - Think            │
                  │  - Act              │
                  │  - Observe          │
                  └──────────┬──────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Dataset Tools  │  │ Code Execution │  │ Answer         │
│                │  │                │  │                │
│ - list         │  │ - Generate     │  │ Return result  │
│ - get_details  │  │ - Execute      │  │ with artifacts │
│ - search       │  │ - Retry        │  │                │
└────────────────┘  └────────┬───────┘  └────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Error Occurred? │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Fast LLM Fix    │
                    │ (attempt 1-2)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Thinking LLM    │
                    │ Fix (attempt 3) │
                    └─────────────────┘
```

## Components

### Backend (Python)
- **dataset_registry.py** - Loads all CSVs at startup, stores metadata
- **planner.py** - ReAct planning loop using thinking LLM
- **agent_tools.py** - Tools available to planner (list_datasets, execute_code, etc.)
- **code_agent/executor.py** - Sandboxed code execution with automatic retry
- **llm/groq_client.py** - All LLM calls (Groq API)

### Frontend (Next.js + React)
- **Overview Tab** - KPI cards
- **Analytics Tab** - Interactive charts (Recharts)
- **Data Explorer** - Browse datasets
- **AI Assistant** - Chat interface with artifact rendering

## Setup

### 1. Backend Setup

```bash
# Create conda environment
conda create -n frammer_agent python=3.11 -y
conda activate frammer_agent

# Install dependencies
cd frammer_agent/backend
pip install -r requirements.txt

# Set environment variable
# Windows (PowerShell):
$env:GROQ_API_KEY="your_key_here"

# Linux/Mac:
export GROQ_API_KEY="your_key_here"

# Run backend
python main_simple.py
```

Backend will start on `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frammer_agent/frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:3000`

## Usage

### Example Queries

1. **List datasets**
   ```
   "What datasets are available?"
   ```

2. **Analyze data**
   ```
   "What's the average publish rate by channel?"
   ```

3. **Plot new KPI**
   ```
   "Plot monthly trend of upload-to-publish efficiency"
   ```

4. **Forecast**
   ```
   "Forecast next 3 months of published volume using ARIMA"
   ```

## How It Works

### Query Flow

1. **User sends query** → Backend `/chat` endpoint
2. **Planning Agent starts ReAct loop**:
   - **Think**: Analyze what's needed
   - **Act**: Choose a tool (list_datasets, execute_code, etc.)
   - **Observe**: Get tool result
   - Repeat until answer is ready
3. **Code Execution** (if needed):
   - LLM generates Python code
   - Execute in subprocess with timeout
   - On error: Pass error back to LLM → Fix → Retry (max 3 attempts)
   - Escalate to thinking LLM on 3rd attempt
4. **Return result** with artifacts (charts, tables)
5. **Frontend renders** in appropriate tab

### Key Features

- **Dataset Agnostic**: Never hardcodes column names
- **Auto-retry**: Automatically fixes code errors using LLM
- **Tool-based**: Planner uses tools (not monolithic code generation)
- **Artifact Rendering**: Charts displayed in Analytics tab
- **Session Memory**: Maintains conversation history

## LLM Configuration

File: `backend/llm/groq_client.py`

```python
FAST_MODEL = "llama-3.1-8b-instant"      # Code gen, routing
THINK_MODEL = "llama-3.3-70b-versatile"  # Planning, fixing errors
```

To switch providers: Edit only this file.

## Logs

All backend activity logged to `frammer_agent/logs/backend_TIMESTAMP.log`

## Troubleshooting

### Backend won't start
- Check `GROQ_API_KEY` is set
- Check port 8000 is available
- Check logs in `frammer_agent/logs/`

### Frontend shows "Backend not available"
- Ensure backend is running on port 8000
- Check CORS settings in `main_simple.py`

### Code execution fails
- Check dataset files exist in parent directory
- Check Python subprocess permissions

## Architecture Decisions

### Why Simple Registry over Semantic Search?
- **Faster**: No embedding computation
- **More accurate**: Direct column name access
- **Better for small datasets**: < 20 datasets don't need semantic search
- **LLM-friendly**: Full column list fits in context window

### Why ReAct Loop?
- **Flexible**: Can call multiple tools
- **Transparent**: Clear reasoning trace
- **Robust**: Handles complex multi-step queries

### Why Separate Code Execution?
- **Safety**: Sandboxed subprocess with timeout
- **Retry logic**: Automatic error correction
- **Isolation**: Failures don't crash main server

## License
MIT
