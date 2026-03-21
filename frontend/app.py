"""
Frammer Agent - Streamlit Frontend
Multi-tab UI for data analysis visualization and AI chat assistant.
"""
import os
import sys
import json
import base64
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional

import streamlit as st
import pandas as pd
import plotly.express as px

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

<<<<<<< HEAD
from frammer_agent.config import DATA_DIR, CHART_CATEGORIES, API_PORT
=======
from frammer_agent.config import DATA_DIR, CHART_CATEGORIES
>>>>>>> 863cf4f6de41c601546c0b01dcf88e8e371d5443

# ─── Configuration ───────────────────────────────────────────────────────────

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:80")
DATA_PATH = Path(DATA_DIR)

# ─── Page Configuration ──────────────────────────────────────────────────────

st.set_page_config(
    page_title="Frammer AI Analytics",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─── Custom CSS ──────────────────────────────────────────────────────────────

st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        color: #4F46E5;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #6B7280;
        margin-bottom: 2rem;
    }
    .kpi-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 1rem;
        color: white;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .kpi-value {
        font-size: 2rem;
        font-weight: 700;
    }
    .kpi-label {
        font-size: 0.9rem;
        opacity: 0.9;
    }
    .chart-container {
        background: white;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        margin-bottom: 1rem;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 2rem;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 0.5rem 1rem;
    }
    .chat-message {
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 0.5rem;
    }
    .user-message {
        background-color: #EEF2FF;
        margin-left: 2rem;
    }
    .assistant-message {
        background-color: #F3F4F6;
        margin-right: 2rem;
    }
</style>
""", unsafe_allow_html=True)


# ─── Helper Functions ────────────────────────────────────────────────────────

def load_image_as_base64(path: Path) -> Optional[str]:
    """Load image file and return as base64."""
    if path.exists():
        return base64.b64encode(path.read_bytes()).decode()
    return None


def load_csv_data(filename: str) -> Optional[pd.DataFrame]:
    """Load CSV file from data directory."""
    path = DATA_PATH / filename
    if path.exists():
        return pd.read_csv(path, encoding="utf-8-sig")
    return None


def call_api(endpoint: str, method: str = "GET", data: Dict = None) -> Optional[Dict]:
    """Call the backend API."""
    try:
        url = f"{API_BASE_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=60)
        else:
            return None
        
        if response.status_code == 200:
            return response.json()
        return None
    except requests.exceptions.ConnectionError:
        return None
    except Exception as e:
        st.error(f"API Error: {e}")
        return None


def get_kpis_from_data() -> Dict[str, Any]:
    """Extract KPIs directly from CSV files (fallback if API unavailable)."""
    kpis = {}
    
    # Try to load main summary data
    for filename in os.listdir(DATA_PATH):
        if filename.endswith('.csv') and 'combined_data' in filename.lower() and 'by' not in filename.lower():
            df = load_csv_data(filename)
            if df is not None:
                # Find relevant columns dynamically
                for col in df.columns:
                    col_lower = col.lower()
                    if 'uploaded' in col_lower and 'count' in col_lower:
                        kpis['Total Uploaded'] = int(df[col].sum())
                    elif 'created' in col_lower and 'count' in col_lower:
                        kpis['Total Processed'] = int(df[col].sum())
                    elif 'published' in col_lower and 'count' in col_lower:
                        kpis['Total Published'] = int(df[col].sum())
                break
    
    # Calculate derived metrics
    if 'Total Processed' in kpis and 'Total Published' in kpis and kpis['Total Processed'] > 0:
        kpis['Publish Rate'] = (kpis['Total Published'] / kpis['Total Processed']) * 100
    
    if 'Total Uploaded' in kpis and 'Total Processed' in kpis and kpis['Total Uploaded'] > 0:
        kpis['Amplification'] = kpis['Total Processed'] / kpis['Total Uploaded']
    
    return kpis


def get_available_charts() -> Dict[str, List[Path]]:
    """Get available PNG charts organized by category."""
    charts = {}
    
    # First, use predefined categories
    for category, filenames in CHART_CATEGORIES.items():
        charts[category] = []
        for fname in filenames:
            path = DATA_PATH / fname
            if path.exists():
                charts[category].append(path)
    
    # Add any uncategorized charts
    categorized = set()
    for filenames in CHART_CATEGORIES.values():
        categorized.update(filenames)
    
    uncategorized = []
    for f in DATA_PATH.glob("*.png"):
        if f.name not in categorized:
            uncategorized.append(f)
    
    if uncategorized:
        charts["Other"] = uncategorized
    
    # Remove empty categories
    charts = {k: v for k, v in charts.items() if v}
    
    return charts


def get_available_datasets() -> List[Dict[str, Any]]:
    """Get list of available CSV files with basic info."""
    datasets = []
    
    for f in DATA_PATH.glob("*.csv"):
        try:
            df = pd.read_csv(f, encoding="utf-8-sig", nrows=5)
            datasets.append({
                "name": f.stem,
                "filename": f.name,
                "rows": "~" + str(len(pd.read_csv(f, encoding="utf-8-sig"))),
                "columns": len(df.columns),
                "column_names": list(df.columns)
            })
        except Exception:
            pass
    
    return datasets


# ─── Initialize Session State ────────────────────────────────────────────────

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

if "session_id" not in st.session_state:
    st.session_state.session_id = None

if "artifacts" not in st.session_state:
    st.session_state.artifacts = []


# ─── Sidebar ─────────────────────────────────────────────────────────────────

with st.sidebar:
    st.image("https://via.placeholder.com/200x60?text=Frammer+AI", width=200)
    st.markdown("---")
    
    st.markdown("### 📅 Analysis Period")
    st.markdown("**March 2025 – February 2026**")
    st.markdown("*(12 months)*")
    
    st.markdown("---")
    
    st.markdown("### 📁 Data Sources")
    datasets = get_available_datasets()
    st.markdown(f"**{len(datasets)}** datasets loaded")
    
    with st.expander("View Datasets"):
        for ds in datasets:
            st.markdown(f"- **{ds['name']}** ({ds['rows']} rows)")
    
    st.markdown("---")
    
    st.markdown("### ⚙️ Backend Status")
    api_status = call_api("/health")
    if api_status:
        st.success("✅ API Connected")
    else:
        st.warning("⚠️ API Offline - Using local data")


# ─── Main Content ────────────────────────────────────────────────────────────

st.markdown('<h1 class="main-header">📊 Frammer AI Analytics</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Interactive Data Analysis Dashboard</p>', unsafe_allow_html=True)

# Create tabs
tab_overview, tab_charts, tab_data, tab_assistant = st.tabs([
    "📈 Overview", "📊 Charts", "🗂️ Data Explorer", "🤖 AI Assistant"
])


# ─── Tab 1: Overview ─────────────────────────────────────────────────────────

with tab_overview:
    st.markdown("### Key Performance Indicators")
    
    # Get KPIs
    kpis = get_kpis_from_data()
    
    if kpis:
        cols = st.columns(5)
        
        with cols[0]:
            st.metric(
                label="Total Uploaded",
                value=f"{kpis.get('Total Uploaded', 0):,}"
            )
        
        with cols[1]:
            st.metric(
                label="Total Processed",
                value=f"{kpis.get('Total Processed', 0):,}"
            )
        
        with cols[2]:
            st.metric(
                label="Total Published",
                value=f"{kpis.get('Total Published', 0):,}"
            )
        
        with cols[3]:
            st.metric(
                label="Publish Rate",
                value=f"{kpis.get('Publish Rate', 0):.2f}%"
            )
        
        with cols[4]:
            st.metric(
                label="Amplification",
                value=f"{kpis.get('Amplification', 0):.2f}x"
            )
    else:
        st.info("KPI data not available. Please ensure data files are present.")
    
    st.markdown("---")
    
    # Show KPI Summary chart if exists
    kpi_chart = DATA_PATH / "kpi_summary.png"
    if kpi_chart.exists():
        st.markdown("### KPI Summary Visualization")
        st.image(str(kpi_chart), use_container_width=True)
    
    # Show funnel chart
    funnel_chart = DATA_PATH / "funnel_by_channel.png"
    if funnel_chart.exists():
        st.markdown("### Upload → Process → Publish Funnel")
        st.image(str(funnel_chart), use_container_width=True)
    
    # Monthly trends
    monthly_chart = DATA_PATH / "monthly_trends.png"
    if monthly_chart.exists():
        st.markdown("### Monthly Trends")
        st.image(str(monthly_chart), use_container_width=True)


# ─── Tab 2: Charts ───────────────────────────────────────────────────────────

with tab_charts:
    st.markdown("### 📊 Analysis Charts Gallery")
    
    charts = get_available_charts()
    
    if not charts:
        st.info("No charts found in the data directory.")
    else:
        # Category selector
        categories = list(charts.keys())
        selected_category = st.selectbox("Select Category", categories)
        
        if selected_category and charts.get(selected_category):
            category_charts = charts[selected_category]
            
            # Display in grid
            cols_per_row = 2
            for i in range(0, len(category_charts), cols_per_row):
                cols = st.columns(cols_per_row)
                for j, col in enumerate(cols):
                    if i + j < len(category_charts):
                        chart_path = category_charts[i + j]
                        with col:
                            st.markdown(f"**{chart_path.stem.replace('_', ' ').title()}**")
                            st.image(str(chart_path), use_container_width=True)
        
        # Show all charts option
        with st.expander("View All Charts"):
            all_charts = list(DATA_PATH.glob("*.png"))
            for chart in sorted(all_charts, key=lambda x: x.name):
                st.markdown(f"#### {chart.stem.replace('_', ' ').title()}")
                st.image(str(chart), use_container_width=True)
                st.markdown("---")


# ─── Tab 3: Data Explorer ────────────────────────────────────────────────────

with tab_data:
    st.markdown("### 🗂️ Data Explorer")
    
    datasets = get_available_datasets()
    
    if not datasets:
        st.info("No datasets found.")
    else:
        # Dataset selector
        dataset_names = [ds["name"] for ds in datasets]
        selected_dataset = st.selectbox("Select Dataset", dataset_names)
        
        if selected_dataset:
            # Find selected dataset info
            ds_info = next((ds for ds in datasets if ds["name"] == selected_dataset), None)
            
            if ds_info:
                # Schema info
                col1, col2 = st.columns([1, 2])
                
                with col1:
                    st.markdown("#### Schema")
                    st.markdown(f"**Rows:** {ds_info['rows']}")
                    st.markdown(f"**Columns:** {ds_info['columns']}")
                    
                    st.markdown("**Column Names:**")
                    for col_name in ds_info["column_names"]:
                        st.markdown(f"- `{col_name}`")
                
                with col2:
                    st.markdown("#### Data Preview")
                    
                    # Load full data
                    df = load_csv_data(ds_info["filename"])
                    
                    if df is not None:
                        # Pagination
                        page_size = st.slider("Rows per page", 10, 100, 25)
                        total_pages = (len(df) - 1) // page_size + 1
                        page = st.number_input("Page", 1, total_pages, 1)
                        
                        start_idx = (page - 1) * page_size
                        end_idx = start_idx + page_size
                        
                        st.dataframe(df.iloc[start_idx:end_idx], use_container_width=True)
                        
                        st.caption(f"Showing rows {start_idx + 1} to {min(end_idx, len(df))} of {len(df)}")
                        
                        # Download button
                        csv_data = df.to_csv(index=False)
                        st.download_button(
                            label="📥 Download Full Dataset",
                            data=csv_data,
                            file_name=ds_info["filename"],
                            mime="text/csv"
                        )


# ─── Tab 4: AI Assistant ─────────────────────────────────────────────────────

with tab_assistant:
    st.markdown("### 🤖 AI Data Analyst")
    st.markdown("Ask questions about your data, request analyses, or generate visualizations.")
    
    # Check API status
    api_available = call_api("/health") is not None
    
    if not api_available:
        st.warning("""
        ⚠️ **Backend API is not running.** 
        
        To enable the AI Assistant, start the backend server:
        ```bash
        cd frammer_agent/backend
        python main.py
        ```
        """)
    
    # Chat interface
    col_chat, col_artifacts = st.columns([2, 1])
    
    with col_chat:
        st.markdown("#### 💬 Chat")
        
        # Display chat history
        chat_container = st.container()
        
        with chat_container:
            for msg in st.session_state.chat_history:
                if msg["role"] == "user":
                    st.markdown(f"""
                    <div class="chat-message user-message">
                        <strong>You:</strong> {msg["content"]}
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div class="chat-message assistant-message">
                        <strong>AI:</strong> {msg["content"]}
                    </div>
                    """, unsafe_allow_html=True)
        
        # Input form
        with st.form(key="chat_form", clear_on_submit=True):
            user_input = st.text_area(
                "Your question",
                placeholder="e.g., What is the overall publish rate? Which channels perform best?",
                height=100
            )
            
            col1, col2, col3 = st.columns([1, 1, 4])
            with col1:
                submit = st.form_submit_button("Send 📤", use_container_width=True)
            with col2:
                clear = st.form_submit_button("Clear 🗑️", use_container_width=True)
        
        if submit and user_input.strip():
            # Add user message
            st.session_state.chat_history.append({
                "role": "user",
                "content": user_input.strip()
            })
            
            if api_available:
                # Call API
                with st.spinner("Thinking..."):
                    response = call_api("/chat", "POST", {
                        "message": user_input.strip(),
                        "session_id": st.session_state.session_id
                    })
                
                if response:
                    st.session_state.session_id = response.get("session_id")
                    st.session_state.chat_history.append({
                        "role": "assistant",
                        "content": response.get("response", "Sorry, I couldn't process that.")
                    })
                    
                    # Store artifacts
                    if response.get("artifacts"):
                        st.session_state.artifacts.extend(response["artifacts"])
                else:
                    st.session_state.chat_history.append({
                        "role": "assistant",
                        "content": "Sorry, there was an error processing your request."
                    })
            else:
                st.session_state.chat_history.append({
                    "role": "assistant",
                    "content": "The AI backend is not available. Please start the backend server to enable AI features."
                })
            
            st.rerun()
        
        if clear:
            st.session_state.chat_history = []
            st.session_state.artifacts = []
            st.rerun()
        
        # Quick actions
        st.markdown("#### ⚡ Quick Questions")
        quick_questions = [
            "What is the overall publish rate?",
            "Which channels have the highest volume?",
            "Show me monthly trends",
            "What datasets are available?",
            "Compare top 5 users by output"
        ]
        
        cols = st.columns(len(quick_questions))
        for i, q in enumerate(quick_questions):
            if cols[i].button(q[:20] + "...", key=f"quick_{i}"):
                st.session_state.chat_history.append({"role": "user", "content": q})
                st.rerun()
    
    with col_artifacts:
        st.markdown("#### 📎 Artifacts")
        
        if st.session_state.artifacts:
            for i, artifact in enumerate(st.session_state.artifacts):
                with st.expander(f"{artifact.get('name', f'Artifact {i+1}')}"):
                    if artifact.get("type") == "image":
                        img_data = artifact.get("data", "")
                        if img_data:
                            st.image(base64.b64decode(img_data))
                    elif artifact.get("type") == "table":
                        data = artifact.get("data", [])
                        if data:
                            st.dataframe(pd.DataFrame(data))
                    elif artifact.get("type") == "chart":
                        data = artifact.get("data", [])
                        if data:
                            df = pd.DataFrame(data)
                            chart_type = artifact.get("chartType", "")
                            x_key = artifact.get("xKey")
                            y_keys = artifact.get("yKeys", [])

                            try:
                                if chart_type in ("line", "area") and x_key and y_keys:
                                    fig = px.line(df, x=x_key, y=y_keys, title=artifact.get("title"))
                                    st.plotly_chart(fig, use_container_width=True)
                                elif chart_type in ("bar", "barh") and x_key and y_keys:
                                    orientation = "h" if chart_type == "barh" else "v"
                                    fig = px.bar(df, x=x_key, y=y_keys, orientation=orientation, title=artifact.get("title"))
                                    st.plotly_chart(fig, use_container_width=True)
                                elif chart_type == "pie" and len(df.columns) >= 2:
                                    fig = px.pie(df, names=df.columns[0], values=df.columns[1], title=artifact.get("title"))
                                    st.plotly_chart(fig, use_container_width=True)
                                else:
                                    st.dataframe(df)
                            except Exception:
                                st.dataframe(df)
                    elif artifact.get("type") == "plotly":
                        st.info("Plotly chart (interactive view)")
                    else:
                        st.json(artifact)
        else:
            st.info("Artifacts from AI analysis will appear here.")
        
        # File upload
        st.markdown("#### 📤 Upload Data")
        uploaded_file = st.file_uploader(
            "Upload CSV/JSON",
            type=["csv", "json"],
            help="Upload new data for analysis"
        )
        
        if uploaded_file and api_available:
            if st.button("Process Upload"):
                # This would call the upload API
                st.info("File upload processing...")


# ─── Footer ──────────────────────────────────────────────────────────────────

st.markdown("---")
st.markdown(
    """
    <div style="text-align: center; color: #9CA3AF; font-size: 0.8rem;">
        Frammer AI Analytics Dashboard | Built with Streamlit & FastAPI
    </div>
    """,
    unsafe_allow_html=True
)
