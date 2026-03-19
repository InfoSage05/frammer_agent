"""
RAG Pipeline - Retrieval-Augmented Generation using Groq LLM
Retrieves relevant data context and uses Groq to generate intelligent answers.
"""
import sys
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

_backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(_backend_dir))
sys.path.insert(0, str(_backend_dir.parent))

from llm.groq_client import fast_complete, think_complete
from context_manager.retrieval import get_retrieval
from context_manager.registry import get_registry
from dbms import list_datasets

logger = logging.getLogger("rag_pipeline")


class RAGPipeline:
    """Retrieval-Augmented Generation pipeline using semantic search and Groq LLM"""
    
    def __init__(self):
        """Initialize RAG components"""
        self.retrieval = get_retrieval()
        self.registry = get_registry()
    
    def retrieve_context(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Retrieve relevant data context from semantic search
        
        Args:
            query: User question
            top_k: Number of top results to retrieve
            
        Returns:
            Dict with retrieved context information
        """
        try:
            # Search for relevant columns/datasets
            results = self.retrieval.search_columns(query, n_results=top_k)
            
            relevant_datasets = {}
            relevant_columns = []
            
            if results:
                for result in results:
                    metadata = result.get("metadata", {})
                    dataset_id = str(metadata.get("dataset_id"))  # Ensure it's a string
                    
                    if dataset_id and dataset_id != "None":
                        if dataset_id not in relevant_datasets:
                            ds = self.registry.get_dataset(dataset_id)
                            if ds:
                                relevant_datasets[dataset_id] = {
                                    "name": ds.get("name"),
                                    "description": ds.get("description"),
                                    "row_count": ds.get("rows"),
                                    "columns": [c.get("name") for c in ds.get("columns", [])]
                                }
                        
                        # Store column info if it's a column result
                        if metadata.get("type") == "column":
                            relevant_columns.append({
                                "dataset_id": dataset_id,
                                "dataset_name": metadata.get("dataset_name"),
                                "name": metadata.get("column_name"),
                                "type": metadata.get("semantic_type"),
                                "relevance": 1 - result.get("distance", 0)  # Convert distance to relevance
                            })
            
            return {
                "relevant_datasets": relevant_datasets,
                "relevant_columns": relevant_columns,
                "total_results": len(results)
            }
        except Exception as e:
            logger.warning(f"Semantic retrieval failed: {e}")
            # Fallback: return all available datasets
            datasets = list_datasets()
            return {
                "relevant_datasets": {
                    str(d["id"]): {
                        "name": d["name"],
                        "description": d.get("description", ""),
                        "row_count": d.get("rows", 0),
                        "columns": d.get("columns", [])[:5]  # Limit columns shown
                    }
                    for d in datasets[:5]
                },
                "relevant_columns": [],
                "total_results": len(datasets)
            }
    
    def generate_answer(
        self,
        query: str,
        context: Dict[str, Any],
        conversation_history: str = "",
        use_thinking_model: bool = False
    ) -> str:
        """
        Generate an answer using Groq LLM with retrieved context
        
        Args:
            query: User question
            context: Retrieved data context
            conversation_history: Previous conversation for context
            use_thinking_model: Use the thinking model for complex questions
            
        Returns:
            Generated answer from Groq
        """
        # Format context for the prompt
        context_text = self._format_context(context)
        
        # Build system prompt
        system_prompt = """You are an intelligent data analyst assistant powered by RAG (Retrieval-Augmented Generation).
        
Your role is to:
1. Answer questions based on the provided data context
2. Reference specific datasets and columns when relevant
3. Provide clear, actionable insights
4. Suggest follow-up analysis when appropriate

Be concise but comprehensive. Always reference the data you're using to answer."""
        
        # Build the prompt with context
        user_prompt = f"""User Question: {query}

Available Data Context:
{context_text}

Conversation History:
{conversation_history if conversation_history else "No previous context"}

Please answer the user's question using the available data context. If the data doesn't contain information to answer the question, suggest what additional data might help."""
        
        # Choose model based on complexity
        if use_thinking_model:
            response = think_complete(
                [{"role": "user", "content": user_prompt}],
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=1024
            )
        else:
            response = fast_complete(
                [{"role": "user", "content": user_prompt}],
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=1024
            )
        
        return response
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format retrieved context for the prompt"""
        lines = []
        
        # List relevant datasets
        if context.get("relevant_datasets"):
            lines.append("📊 Relevant Datasets:")
            for ds_id, ds_info in context["relevant_datasets"].items():
                lines.append(f"\n- **{ds_info['name']}**")
                lines.append(f"  Rows: {ds_info.get('row_count', 'unknown')}")
                lines.append(f"  Description: {ds_info.get('description', 'N/A')}")
                if ds_info.get('columns'):
                    cols = ", ".join(ds_info['columns'][:5])
                    if len(ds_info['columns']) > 5:
                        cols += f", ... and {len(ds_info['columns']) - 5} more"
                    lines.append(f"  Columns: {cols}")
        
        # List relevant columns
        if context.get("relevant_columns"):
            lines.append("\n📌 Relevant Columns:")
            for col in context["relevant_columns"][:5]:
                lines.append(f"- {col['name']} ({col['type']})")
                if col.get('description'):
                    lines.append(f"  {col['description']}")
        
        return "\n".join(lines) if lines else "No specific data context available"
    
    def ask(
        self,
        query: str,
        conversation_history: str = "",
        use_thinking_model: bool = False
    ) -> Dict[str, Any]:
        """
        Main RAG pipeline: Retrieve context and generate answer
        
        Args:
            query: User question
            conversation_history: Previous conversation
            use_thinking_model: Use thinking model for complex queries
            
        Returns:
            Dict with response and metadata
        """
        logger.info(f"RAG: Processing query: {query[:100]}")
        
        # Retrieve relevant context
        context = self.retrieve_context(query)
        logger.info(f"RAG: Retrieved {context.get('total_results', 0)} relevant items")
        
        # Generate answer using Groq
        answer = self.generate_answer(
            query=query,
            context=context,
            conversation_history=conversation_history,
            use_thinking_model=use_thinking_model
        )
        
        # Ensure all dataset references are strings
        datasets_referenced = [str(ds_id) for ds_id in context.get("relevant_datasets", {}).keys()]
        
        return {
            "response": answer,
            "context_used": context,
            "context_size": context.get("total_results", 0),
            "datasets_referenced": datasets_referenced
        }


# Singleton instance
_pipeline: Optional[RAGPipeline] = None


def get_rag_pipeline() -> RAGPipeline:
    """Get or create the RAG pipeline singleton"""
    global _pipeline
    if _pipeline is None:
        _pipeline = RAGPipeline()
    return _pipeline
