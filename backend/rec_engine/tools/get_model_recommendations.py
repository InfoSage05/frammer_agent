"""
tools/get_model_recommendations.py
===================================
Tool 3 — Embedding-Based Candidate Retrieval
----------------------------------------------
Produces the **mathematical baseline** of the top-N candidate items for a
given user by:

  1. Building a user *preference profile* vector — the mean of sentence-
     transformer embeddings for items the user has previously interacted with.
     If the user has no history, a zero vector falls back to a popularity
     ranking based on avg_ctr.

  2. Querying ChromaDB (cosine similarity) for the nearest-neighbour items.

  3. Returning candidate item IDs + cosine similarity scores as JSON.

─────────────────────────────────────────────────────────────────────────────
HOW TO SWAP IN A FINE-TUNED HUGGING FACE MODEL
─────────────────────────────────────────────────────────────────────────────
Option A — Drop-in SentenceTransformer replacement
    Change EMBED_MODEL in seed_data.py and here to your fine-tuned model:
        EMBED_MODEL = "your-org/your-finetuned-biencoder"
    The rest of the code stays identical.

Option B — Raw AutoModel (e.g. custom two-tower network)
    Replace the `_embed_texts()` helper below with:

        from transformers import AutoTokenizer, AutoModel
        import torch

        _tokenizer = AutoTokenizer.from_pretrained("your-org/your-model")
        _hf_model  = AutoModel.from_pretrained("your-org/your-model")

        def _embed_texts(texts: list[str]) -> list[list[float]]:
            inputs = _tokenizer(texts, padding=True, truncation=True,
                                max_length=128, return_tensors="pt")
            with torch.no_grad():
                outputs = _hf_model(**inputs)
            # Mean-pool last hidden state
            vecs = outputs.last_hidden_state.mean(dim=1)
            return vecs.cpu().numpy().tolist()

Option C — Use a cross-encoder re-ranker AFTER ChromaDB retrieval
    After the `collection.query()` call, score (user_query_text, item_doc)
    pairs with a CrossEncoder and re-sort before returning.
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import numpy as np
from langchain_core.tools import tool
from sqlalchemy import text

from ..data.seed_data import get_chroma_collection, get_db_engine

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

# Set to "sentence-transformers/all-MiniLM-L6-v2" or your fine-tuned model.
# Must match the model used in seed_data.py so vector spaces are compatible.
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

DEFAULT_TOP_N = 10      # number of candidates to surface
MIN_CANDIDATES = 1      # guard against very sparse users


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _embed_texts(texts: list[str], model) -> np.ndarray:
    """
    Embed a list of strings using the loaded SentenceTransformer model.
    Returns a 2-D float32 numpy array of shape (len(texts), embedding_dim).

    Swap this function body for Option B or C above to use a raw HF model.
    """
    return np.array(model.encode(texts, show_progress_bar=False), dtype=np.float32)


def _get_user_history(user_id: str) -> list[tuple[str, float]]:
    """
    Fetches (item_id, rating) pairs from the interaction history for a user.
    Returns an empty list for new / cold-start users.
    """
    engine = get_db_engine()
    query  = text(
        "SELECT item_id, rating FROM interactions WHERE user_id = :uid"
    )
    with engine.connect() as conn:
        rows = conn.execute(query, {"uid": user_id}).fetchall()
    return [(r[0], r[1]) for r in rows]


def _get_item_documents(item_ids: list[str]) -> dict[str, str]:
    """
    Fetches pre-computed text descriptions for items from ChromaDB.
    Returns a dict: item_id → description string.
    """
    collection, _ = get_chroma_collection()
    if not item_ids:
        return {}
    result = collection.get(ids=item_ids, include=["documents"])
    return dict(zip(result["ids"], result["documents"]))


def _build_user_profile_vector(user_id: str, model) -> Optional[np.ndarray]:
    """
    Builds a mean-pooled preference vector from the user's interaction history.
    Returns None for cold-start users (no history).
    """
    history = _get_user_history(user_id)
    if not history:
        logger.info("[Tool] Cold-start user detected: %s — falling back to popularity", user_id)
        return None

    # Weight each interacted item's embedding by its rating
    item_ids = [h[0] for h in history]
    ratings  = np.array([h[1] for h in history], dtype=np.float32)

    docs = _get_item_documents(item_ids)

    descriptions = [docs.get(iid, iid) for iid in item_ids]  # fallback to ID if doc missing
    embeddings   = _embed_texts(descriptions, model)          # (n_history, dim)

    # Weighted mean
    weights  = ratings / ratings.sum()
    profile  = (embeddings.T * weights).T.sum(axis=0)        # (dim,)
    return profile.astype(np.float32)


def _fallback_popular_items(top_n: int) -> list[dict]:
    """
    Cold-start fallback: returns the top-N items ranked by avg_ctr from SQLite.
    """
    engine = get_db_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT item_id, avg_ctr FROM items ORDER BY avg_ctr DESC LIMIT :n"),
            {"n": top_n},
        ).mappings().all()
    return [
        {"item_id": r["item_id"], "similarity_score": round(float(r["avg_ctr"]), 4)}
        for r in rows
    ]


# ─── LangChain Tool ──────────────────────────────────────────────────────────

@tool
def get_model_recommendations(user_id: str, top_n: int = DEFAULT_TOP_N) -> str:
    """
    Generate the mathematical baseline of top candidate items for a user
    using semantic vector search (cosine similarity in ChromaDB).

    This tool does NOT apply business logic — it purely returns the
    ML model's best guesses. The agent will call query_dataset() next to
    enrich these candidates with metadata, then apply KPI-based re-ranking.

    Parameters
    ----------
    user_id : str
        Unique user identifier, e.g. "user_042".
    top_n   : int, optional
        Number of candidate items to retrieve (default 50, max 100).

    Returns
    -------
    str
        A JSON object with two keys:
          "method"     : "vector_search" | "popularity_fallback"
          "candidates" : list of {item_id, similarity_score} dicts,
                         sorted descending by similarity_score.

    Notes
    -----
    * For warm users:   builds a weighted-mean profile vector from history,
                        then queries ChromaDB via cosine similarity.
    * For cold users:   falls back to popularity ranking (avg_ctr) from SQL.

    HOW TO SWAP IN A FINE-TUNED HF MODEL
    -------------------------------------
    See the module-level docstring in this file for three upgrade paths
    (SentenceTransformer drop-in, raw AutoModel, cross-encoder re-ranker).
    """
    logger.info("[Tool] get_model_recommendations(user_id=%s, top_n=%d)", user_id, top_n)

    top_n = max(MIN_CANDIDATES, min(top_n, 100))  # guard rails

    collection, model = get_chroma_collection()

    # ── Build user profile vector ─────────────────────────────────────────────
    profile_vector = _build_user_profile_vector(user_id, model)

    if profile_vector is None:
        # Cold-start: return popular items
        candidates = _fallback_popular_items(top_n)
        result = {"method": "popularity_fallback", "candidates": candidates}
    else:
        # Warm user: cosine similarity search in ChromaDB
        query_results = collection.query(
            query_embeddings=[profile_vector.tolist()],
            n_results=top_n,
            include=["distances"],          # ChromaDB returns L2 or cosine distance
        )

        ids       = query_results["ids"][0]
        distances = query_results["distances"][0]

        # ChromaDB cosine distance = 1 - cosine_similarity
        # Convert to similarity score in [0, 1]
        candidates = [
            {
                "item_id":          iid,
                "similarity_score": round(max(0.0, 1.0 - dist), 4),
            }
            for iid, dist in zip(ids, distances)
        ]
        result = {"method": "vector_search", "candidates": candidates}

    output = json.dumps(result, indent=2)
    logger.debug(
        "[Tool] get_model_recommendations() returning %d candidates via %s",
        len(result["candidates"]),
        result["method"],
    )
    return output
