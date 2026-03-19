# RAG Pipeline with Groq LLM - Setup Guide

## What Was Set Up

I've successfully connected your Frammer AI system with a **Retrieval-Augmented Generation (RAG) pipeline** powered by **Groq LLM**. Here's what was implemented:

### 1. **Environment Configuration**
- ✅ Created `.env` file with your Groq API key
- ✅ The key is securely stored and never committed to git (.env is in .gitignore)
- ✅ Backend automatically loads the API key on startup

### 2. **RAG Pipeline Module** (`backend/rag_pipeline.py`)
New module that handles context-aware question answering:

#### Features:
- **Semantic Retrieval**: Uses ChromaDB + sentence-transformers to find relevant datasets/columns based on user questions
- **Context Formatting**: Automatically extracts and formats relevant data context
- **Groq Integration**: Uses Groq's fast and thinking models for intelligent responses
- **Conversation Memory**: Maintains session history for better context awareness

#### Key Classes:
```python
class RAGPipeline:
    - retrieve_context(): Finds relevant datasets and columns
    - generate_answer(): Creates intelligent responses using Groq
    - ask(): Main method combining retrieval + generation
```

### 3. **Backend `/ask-ai` Endpoint** (in `backend/main_simple.py`)
New REST endpoint for RAG-based queries:

```bash
POST /ask-ai
Content-Type: application/json

{
  "question": "What is the publish rate?",
  "session_id": "optional-session-id",
  "use_thinking_model": false
}

Response:
{
  "answer": "The publish rate is...",
  "session_id": "...",
  "context_size": 5,
  "datasets_referenced": ["dataset-name"]
}
```

### 4. **Frontend Chat Panel Enhancement**
Updated `frontend/src/components/chat/ChatPanel.tsx`:

- ✅ Added **RAG Mode Toggle Button** in the header
- ✅ Switch between:
  - **Chat Mode**: Full orchestrator with analysis & visualizations
  - **RAG Mode**: Fast, context-aware answers from your data
- ✅ Visual indicator showing active mode
- ✅ Both modes use Groq LLM powered by your API key

---

## How to Use

### Option 1: Using the Frontend (Recommended)

1. **Open the Chat Panel** (AI Assistant icon in the sidebar)
2. **Toggle RAG Mode** - Click the button in the header (should show 🎯 RAG)
3. **Ask Context-Aware Questions**:
   - "What datasets do we have?"
   - "Describe the channel performance data"
   - "Which columns contain user information?"
   - "What metrics are available for publishing data?"

### Option 2: Using the API Directly

```bash
curl -X POST http://localhost:8000/ask-ai \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the publish rate?",
    "use_thinking_model": false
  }'
```

---

## How the RAG Pipeline Works

```
1. User Question
   ↓
2. Semantic Search
   - Search ChromaDB vector store
   - Find relevant datasets and columns
   - Extract dataset metadata
   ↓
3. Context Formatting
   - Format relevant data information
   - Include column descriptions
   - Add dataset statistics
   ↓
4. Groq LLM Generation
   - Pass question + context to Groq
   - Get intelligent, context-aware response
   ↓
5. Return Answer + Metadata
   - Answer text
   - Context size (number of relevant items)
   - Referenced datasets
   - Store in session memory for future context
```

---

## Configuration

### Groq Models Used

1. **Fast Model**: `llama-3.1-8b-instant`
   - Used for quick answers and routing
   - Lower latency, sufficient for most queries
   - Default mode

2. **Thinking Model**: `llama-3.3-70b-versatile`
   - Used for complex analysis and planning
   - Higher accuracy, takes longer
   - Enabled via `use_thinking_model: true` in request

### Environment Variables

In `.env` file:
```
GROQ_API_KEY=your_api_key_here
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=http://localhost:3000
```

---

## API Response Examples

### Example 1: Simple Question

**Request:**
```json
{
  "question": "What datasets are available?"
}
```

**Response:**
```json
{
  "answer": "Based on the available data context, you have the following datasets...",
  "context_size": 3,
  "datasets_referenced": ["monthly-chart", "channel-data", "user-stats"]
}
```

### Example 2: Complex Analysis

**Request:**
```json
{
  "question": "Compare the publish rates across different channels",
  "use_thinking_model": true
}
```

**Response:**
```json
{
  "answer": "Based on the channel data in your system, here's the breakdown...",
  "context_size": 8,
  "datasets_referenced": ["channel-data"]
}
```

---

## Features of RAG Pipeline

### ✅ Advantages

1. **Context-Aware**: Answers are based on your actual data structure
2. **Fast**: Uses semantic search for quick retrieval (no full scans)
3. **Accurate**: Groq LLM with full context prevents hallucinations
4. **Session Memory**: Remembers conversation history for better context
5. **Scalable**: Works with any number of datasets
6. **Configurable**: Choose between fast and thinking models

### 🔍 What It Can Answer

- Dataset availability and descriptions
- Column types and meanings
- Data statistics and summaries
- Recommendations for analysis
- Schema information
- Data quality insights
- Guidance for queries

### ❌ What It's Not Designed For

- Executing complex data analysis (use Chat mode for that)
- Creating visualizations (use Chat mode for charts)
- Running code generation (use Chat mode for that)
- RAG is better for quick Q&A about data structure/availability

---

## Testing the Setup

### 1. Test via Frontend

1. Navigate to http://localhost:3000
2. Click the AI Assistant button
3. Click the **Chat** button to toggle to **🎯 RAG** mode
4. Ask: "What datasets are available?"
5. You should get a context-aware response

### 2. Test via API

```bash
curl -X POST http://localhost:8000/ask-ai \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the schema of the main dataset?",
    "use_thinking_model": false
  }'
```

### 3. Check Backend Logs

The backend logs show:
```
INFO: Ask AI request: What datasets are available?...
INFO: RAG: Retrieved 5 relevant items
INFO: Ask AI Response: 234 chars, 2 datasets referenced
```

---

## Troubleshooting

### ❌ "GROQ_API_KEY environment variable not set"

**Solution:** 
- Make sure `.env` file exists in `/Users/harshnahata/Desktop/gc26-master/`
- Restart the backend server
- Check that the API key is correctly set

### ❌ "No RAG responses, just errors"

**Solution:**
- Make sure datasets are loaded (check `/datasets` endpoint)
- Verify ChromaDB vector store is initialized
- Check backend logs for specific errors

### ❌ "Semantic search not finding relevant items"

**Solution:**
- This is normal if your questions don't match dataset descriptions
- Try asking about available datasets first
- Use Chat mode for more complex analysis

---

## Advanced Usage

### Using Thinking Model for Complex Queries

```bash
curl -X POST http://localhost:8000/ask-ai \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Based on the available data, what insights can you provide about publishing trends?",
    "use_thinking_model": true
  }'
```

### Maintaining Session Context

```bash
# First question
curl -X POST http://localhost:8000/ask-ai \
  -d '{
    "question": "What datasets have channel information?",
    "session_id": "my-session-123"
  }'

# Follow-up question (will remember previous context)
curl -X POST http://localhost:8000/ask-ai \
  -d '{
    "question": "What are the columns in that dataset?",
    "session_id": "my-session-123"
  }'
```

---

## Next Steps

1. **Test the RAG Pipeline** - Use the UI or API to ask questions
2. **Refine Data Metadata** - Better dataset descriptions → better RAG responses
3. **Index More Data** - Add more datasets for richer context
4. **Customize System Prompts** - Modify `rag_pipeline.py` for domain-specific answers
5. **Monitor Usage** - Check logs to see which queries work best

---

## Files Modified/Created

### New Files:
- ✅ `.env` - Environment configuration with Groq API key
- ✅ `backend/rag_pipeline.py` - RAG pipeline implementation

### Modified Files:
- ✅ `backend/main_simple.py` - Added `/ask-ai` endpoint
- ✅ `frontend/src/components/chat/ChatPanel.tsx` - Added RAG mode toggle

---

## Support

For issues or questions:
1. Check backend logs at `logs/backend_*.log`
2. Verify `.env` file has correct API key
3. Test the `/ask-ai` endpoint directly with curl
4. Check that datasets are properly loaded

---

**Setup Complete! Your RAG pipeline is ready to use with Groq LLM.** 🚀
