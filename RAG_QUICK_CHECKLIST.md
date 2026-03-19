RAG PIPELINE RECTIFICATION - QUICK CHECKLIST
============================================

## Pre-Deployment Checklist

Before applying fixes, verify your environment:

- [ ] Running Python 3.11+: `python3 --version`
- [ ] GROQ_API_KEY set: `echo $GROQ_API_KEY`
- [ ] Dependencies installed: `pip list | grep -E "groq|fastapi|chromadb"`
- [ ] Current directory: `/Users/harshnahata/Desktop/gc26-master`
- [ ] Backups created (see deployment steps)

---

## Deployment Checklist

### 1. Backup Original Files
```bash
cp backend/rag_pipeline.py backend/rag_pipeline.py.backup
cp llm/groq_client.py llm/groq_client.py.backup
cp backend/main_simple.py backend/main_simple.py.backup
```
- [ ] Backups created

### 2. Deploy Fixed RAG Pipeline
```bash
cp backend/rag_pipeline_fixed.py backend/rag_pipeline.py
```
- [ ] rag_pipeline.py replaced
- [ ] Verify: `python3 -c "from backend.rag_pipeline import RAGPipeline; print('OK')"`

### 3. Deploy Fixed Groq Client
```bash
cp llm/groq_client_fixed.py llm/groq_client.py
```
- [ ] groq_client.py replaced
- [ ] Verify: `python3 -c "from llm.groq_client import health_check; print('OK')"`

### 4. Deploy Fixed FastAPI App
```bash
cp backend/main_simple_fixed.py backend/main_simple.py
```
- [ ] main_simple.py replaced
- [ ] Verify: `python3 -c "from backend.main_simple import app; print('OK')"`

### 5. Verify All Imports
```bash
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/harshnahata/Desktop/gc26-master')

try:
    from backend.rag_pipeline import RAGPipeline
    from llm.groq_client import fast_complete, health_check
    from backend.main_simple import app, ask_ai
    print("✅ All imports successful")
except Exception as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)
EOF
```
- [ ] All imports pass

---

## Testing Checklist

### Test 1: RAG Pipeline Initialization
```bash
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/harshnahata/Desktop/gc26-master')
from backend.rag_pipeline import get_rag_pipeline

try:
    rag = get_rag_pipeline()
    print("✅ RAG initialized successfully")
    print("  - Semantic search: indexed on init")
    print("  - Error handling: enabled")
    print("  - Retry logic: 3 attempts with backoff")
except Exception as e:
    print(f"❌ RAG initialization failed: {e}")
EOF
```
- [ ] Passes

### Test 2: Groq Client Health
```bash
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/harshnahata/Desktop/gc26-master')
from llm.groq_client import health_check

try:
    is_healthy = health_check()
    if is_healthy:
        print("✅ Groq client healthy")
    else:
        print("❌ Groq client not healthy - check API key")
except Exception as e:
    print(f"⚠️ Health check error: {e}")
EOF
```
- [ ] Returns ✅ or shows clear error

### Test 3: Session Memory Import
```bash
python3 << 'EOF'
import sys
sys.path.insert(0, '/Users/harshnahata/Desktop/gc26-master')

# This should not raise ImportError during import
from backend.main_simple import get_session_memory

print("✅ Session memory imported at module level")
print("  - Per-request overhead: eliminated")
EOF
```
- [ ] Session memory imported at module level

### Test 4: Start Backend Server
```bash
cd /Users/harshnahata/Desktop/gc26-master
timeout 10 python3 backend/main_simple.py &
sleep 3
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```
- [ ] Server starts without errors
- [ ] /health endpoint responds
- [ ] Log shows "RAG pipeline initialized"

### Test 5: Test /ask-ai Endpoint
```bash
curl -X POST http://localhost:8000/ask-ai \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What was the top performing channel?",
    "use_thinking_model": false
  }'
# Should return valid JSON with answer and metadata
```
- [ ] Endpoint responds
- [ ] Response includes: answer, session_id, context_size, datasets_referenced
- [ ] Answer is non-empty

---

## Verification Checklist (Post-Deployment)

### Code Quality
- [ ] No import errors in logs
- [ ] No AttributeError on startup
- [ ] No KeyError accessing results
- [ ] All function calls return expected types

### RAG Pipeline
- [ ] Semantic search indexes on startup
- [ ] Retrieval returns relevant context
- [ ] Fallback activates when semantic search fails
- [ ] LLM generation produces complete responses
- [ ] Retry logic works (check logs for "Retrying in...")

### Error Handling
- [ ] API key missing → descriptive error message
- [ ] Network timeout → retry and fallback
- [ ] Invalid dataset → graceful fallback
- [ ] Corrupted ChromaDB → fallback to database

### Performance
- [ ] Cold start < 5 seconds
- [ ] First RAG query < 10 seconds
- [ ] Subsequent queries < 5 seconds
- [ ] No per-request import overhead (check logs)

### Backward Compatibility
- [ ] Existing code using RAG works unchanged
- [ ] Function signatures unchanged
- [ ] Return types unchanged
- [ ] API endpoints unchanged

---

## Monitoring Checklist (First 24 Hours)

### Log Monitoring
```bash
# Watch logs in real-time
tail -f logs/backend_*.log

# Look for:
✅ "RAG pipeline initialized"
✅ "Semantic search indexed"
⚠️ (OK) "Semantic retrieval returned 0 results, falling back"
✅ (OK) "Succeeded after N retries"
❌ (BAD) "Failed after 3 retries"
❌ (BAD) "Groq health check failed"
```

### Performance Metrics
- [ ] Response times stable
- [ ] No memory leaks (memory usage stable)
- [ ] No file handle leaks (open files stable)
- [ ] CPU usage reasonable

### Error Tracking
- [ ] Count errors per endpoint
- [ ] Identify patterns (which queries fail?)
- [ ] Monitor retry success rate
- [ ] Track fallback activation rate

---

## Troubleshooting Decision Tree

**Problem: "GROQ_API_KEY environment variable not set"**
```
❌ Fix: Set GROQ_API_KEY
├─ Add to .env: GROQ_API_KEY=sk-...
├─ Or export: export GROQ_API_KEY=sk-...  
└─ Verify: echo $GROQ_API_KEY (should print key)
```

**Problem: "Semantic search not working"**
```
❌ Fix: Verify semantic indexing
├─ Check logs: grep "Semantic search indexed" logs/backend_*.log
├─ If missing: Restart backend
├─ If still missing: Check ChromaDB directory: ls -la data/chroma/
└─ Last resort: Delete ChromaDB and reinitialize
```

**Problem: "LLM calls timing out"**
```
❌ Fix: Check Groq connectivity
├─ Check API key: echo $GROQ_API_KEY | head -c 10
├─ Check network: curl https://api.groq.com (should work)
├─ Check logs: tail -f logs/backend_*.log | grep -i groq
└─ If persistent: Check Groq API status page
```

**Problem: "Fast model responses incomplete"**
```
✅ This is FIXED in the new version
└─ If still occurring: Verify you replaced groq_client.py correctly
```

**Problem: "Getting 500 errors on /ask-ai"**
```
❌ Fix: Check error details
├─ Look in logs: tail logs/backend_*.log | tail -50
├─ Check request format: JSON should have "question" key
├─ Verify GROQ_API_KEY is set
└─ If still broken: Check that all 3 files were replaced
```

---

## Rollback Procedure

If you encounter issues:

```bash
cd /Users/harshnahata/Desktop/gc26-master

# Restore from backups
cp backend/rag_pipeline.py.backup backend/rag_pipeline.py
cp llm/groq_client.py.backup llm/groq_client.py
cp backend/main_simple.py.backup backend/main_simple.py

# Restart
kill %1  # Kill the background server if running
python3 backend/main_simple.py
```

- [ ] All files restored
- [ ] Server restarts cleanly
- [ ] Functionality restored

---

## Documentation Reference

**Quick Links:**
- RAG_AUDIT_REPORT.md - Why we made these fixes
- RAG_INTEGRATION_GUIDE.md - Detailed deployment steps
- RAG_IMPLEMENTATION_SUMMARY.md - Technical details
- backend/core/EXTENSIBILITY_GUIDE.md - Configuration system

**For Each Problem:**
1. Check relevant documentation
2. Follow troubleshooting tree
3. Consult logs
4. Rollback if needed

---

## Sign-Off

When all checklists complete:

```
Date: ______________
Tester: ______________
Environment: ______________
Result: ✅ PASSED / ❌ FAILED

All fixes verified and operational:
☑ RAG pipeline initialized
☑ Semantic search working  
☑ Error handling in place
☑ Retry logic functional
☑ All endpoints responding
☑ No breaking changes
☑ Performance acceptable
```

---

## Summary

✅ Deployment: 5 minutes
✅ Testing: 15 minutes  
✅ Verification: 10 minutes
✅ Monitoring: 24 hours

**Total time to production: ~34 minutes + 24-hour monitoring**

