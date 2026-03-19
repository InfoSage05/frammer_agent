"""
Semantic Column Search - Vector-based retrieval over column descriptions.
Uses sentence-transformers for embeddings and ChromaDB for storage.
"""
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import chromadb
from chromadb.config import Settings

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import CHROMA_PERSIST_DIR
from context_manager.registry import get_registry


class SemanticRetrieval:
    """Semantic search over dataset schemas using embeddings."""
    
    def __init__(self):
        # Use persistent client for newer ChromaDB versions
        try:
            self.chroma_client = chromadb.PersistentClient(
                path=str(CHROMA_PERSIST_DIR),
                settings=Settings(anonymized_telemetry=False)
            )
        except Exception:
            # Fallback for older versions or in-memory
            self.chroma_client = chromadb.Client(Settings(
                anonymized_telemetry=False
            ))
        
        self.collection = self.chroma_client.get_or_create_collection(
            name="column_embeddings",
            metadata={"hnsw:space": "cosine"}
        )
        self._embedding_model = None
    
    @property
    def embedding_model(self):
        """Lazy load embedding model."""
        if self._embedding_model is None:
            from sentence_transformers import SentenceTransformer
            self._embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        return self._embedding_model
    
    def index_datasets(self):
        """Index all registered datasets for semantic search."""
        registry = get_registry()
        datasets = registry.list_datasets()
        
        documents = []
        metadatas = []
        ids = []
        
        for ds in datasets:
            full_ds = registry.get_dataset(ds["id"])
            if not full_ds:
                continue
            
            # Index dataset-level document
            ds_doc = f"Dataset: {ds['name']}. {ds['description']}"
            documents.append(ds_doc)
            metadatas.append({
                "type": "dataset",
                "dataset_id": ds["id"],
                "dataset_name": ds["name"]
            })
            ids.append(f"dataset_{ds['id']}")
            
            # Index each column
            for col in full_ds.get("columns", []):
                col_doc = f"Column '{col['name']}' in dataset '{ds['name']}'. "
                col_doc += f"Type: {col['semantic_type']}. "
                if col.get("description"):
                    col_doc += col["description"]
                if col.get("top_values"):
                    col_doc += f" Sample values: {', '.join(col['top_values'][:5])}"
                
                documents.append(col_doc)
                metadatas.append({
                    "type": "column",
                    "dataset_id": ds["id"],
                    "dataset_name": ds["name"],
                    "column_name": col["name"],
                    "semantic_type": col.get("semantic_type", "unknown")
                })
                ids.append(f"column_{ds['id']}_{col['name']}")
        
        if documents:
            # Generate embeddings
            embeddings = self.embedding_model.encode(documents).tolist()
            
            # Upsert to ChromaDB
            self.collection.upsert(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )
    
    def search_columns(
        self,
        query: str,
        n_results: int = 10,
        filter_type: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for relevant columns/datasets by natural language query.
        
        Args:
            query: Natural language search query
            n_results: Maximum number of results
            filter_type: Filter by "dataset" or "column"
        
        Returns:
            List of matching items with metadata and relevance scores
        """
        query_embedding = self.embedding_model.encode([query]).tolist()
        
        where_filter = None
        if filter_type:
            where_filter = {"type": filter_type}
        
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
        
        output = []
        if results and results["ids"]:
            for i, id_ in enumerate(results["ids"][0]):
                output.append({
                    "id": id_,
                    "document": results["documents"][0][i] if results["documents"] else "",
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0
                })
        
        return output
    
    def find_columns_for_task(self, task_description: str) -> List[Tuple[str, str, float]]:
        """
        Find relevant columns for a given analysis task.
        
        Returns:
            List of (dataset_name, column_name, relevance_score) tuples
        """
        results = self.search_columns(task_description, n_results=15, filter_type="column")
        
        return [
            (
                r["metadata"].get("dataset_name", ""),
                r["metadata"].get("column_name", ""),
                1 - r["distance"]  # Convert distance to similarity
            )
            for r in results
            if r["metadata"].get("type") == "column"
        ]
    
    def find_datasets_for_query(self, query: str) -> List[Dict]:
        """Find relevant datasets for a query."""
        results = self.search_columns(query, n_results=5, filter_type="dataset")
        
        return [
            {
                "dataset_id": r["metadata"].get("dataset_id"),
                "dataset_name": r["metadata"].get("dataset_name"),
                "relevance": 1 - r["distance"]
            }
            for r in results
        ]


# ─── Singleton Instance ──────────────────────────────────────────────────────
_retrieval: Optional[SemanticRetrieval] = None

def get_retrieval() -> SemanticRetrieval:
    """Get or create the singleton retrieval instance."""
    global _retrieval
    if _retrieval is None:
        _retrieval = SemanticRetrieval()
    return _retrieval
