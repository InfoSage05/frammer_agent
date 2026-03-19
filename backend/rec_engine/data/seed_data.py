"""
seed_data.py
============
Seeds two stores on first import:

  1. An **in-memory SQLite database** (via SQLAlchemy) with:
       - 200 synthetic users
       - 500 synthetic items  (name, category, price, margin_pct,
                               inventory, avg_ctr, listed_days_ago)
       - 2 000 user–item interaction rows (rating, timestamp)

  2. A **ChromaDB collection** ("rec_items") with sentence-transformer
     embeddings for every item's textual description.

Both stores are singletons — call `get_db_engine()` and `get_chroma_collection()`
to get the same instance across every tool invocation.

Usage
-----
    from backend.rec_engine.data.seed_data import get_db_engine, get_chroma_collection
"""

from __future__ import annotations

import json
import random
import logging
from pathlib import Path
from functools import lru_cache
from typing import Optional

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text, Engine

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

RANDOM_SEED = 42
N_USERS     = 200
N_ITEMS     = 500
N_INTERACTIONS = 2_000

CATEGORIES = [
    "Electronics", "Clothing", "Home & Kitchen", "Sports", "Books",
    "Beauty", "Toys", "Groceries", "Automotive", "Garden",
]

ADJECTIVES = ["Premium", "Classic", "Smart", "Ultra", "Pro", "Lite", "Elite", "Essential"]
NOUNS      = ["Widget", "Gadget", "Device", "Kit", "Set", "Pack", "Bundle", "Collection"]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _random_item_name(rng: random.Random) -> str:
    return f"{rng.choice(ADJECTIVES)} {rng.choice(NOUNS)} {rng.randint(100, 999)}"


def _build_item_description(row: dict) -> str:
    """Human-readable description used to create embedding vectors."""
    return (
        f"{row['name']} — a {row['category']} product priced at ${row['price']:.2f}. "
        f"Gross margin {row['margin_pct']:.0f}%, {row['inventory']} units in stock, "
        f"listed {row['listed_days_ago']} days ago with an average CTR of {row['avg_ctr']:.3f}."
    )


# ─── SQLite Database ──────────────────────────────────────────────────────────

def _create_users(rng: random.Random) -> list[dict]:
    users = []
    for i in range(1, N_USERS + 1):
        users.append({
            "user_id":     f"user_{i:03d}",
            "age":          rng.randint(18, 70),
            "gender":       rng.choice(["M", "F", "Other"]),
            "location":     rng.choice(["US", "UK", "IN", "DE", "JP", "CA", "AU"]),
            "signup_days":  rng.randint(1, 1500),
            "preferred_cat": rng.choice(CATEGORIES),
        })
    return users


def _create_items(rng: random.Random) -> list[dict]:
    items = []
    for i in range(1, N_ITEMS + 1):
        category = rng.choice(CATEGORIES)
        price    = round(rng.uniform(5.0, 500.0), 2)
        items.append({
            "item_id":        f"item_{i:04d}",
            "name":           _random_item_name(rng),
            "category":       category,
            "price":          price,
            "margin_pct":     round(rng.uniform(5.0, 60.0), 2),
            "inventory":      rng.randint(0, 300),
            "avg_ctr":        round(rng.uniform(0.01, 0.35), 4),
            "listed_days_ago": rng.randint(1, 365),
            "description":    "",   # filled below
        })
    # fill descriptions after the full row exists
    for it in items:
        it["description"] = _build_item_description(it)
    return items


def _create_interactions(rng: random.Random, users: list[dict], items: list[dict]) -> list[dict]:
    interactions = []
    for _ in range(N_INTERACTIONS):
        interactions.append({
            "interaction_id": len(interactions) + 1,
            "user_id":  rng.choice(users)["user_id"],
            "item_id":  rng.choice(items)["item_id"],
            "rating":   round(rng.uniform(1.0, 5.0), 1),
            "event_type": rng.choice(["view", "click", "purchase", "wishlist"]),
            "timestamp": pd.Timestamp("2024-01-01") + pd.Timedelta(days=rng.randint(0, 365)),
        })
    return interactions


@lru_cache(maxsize=1)
def get_db_engine() -> Engine:
    """
    Returns (and lazily creates) the singleton SQLAlchemy Engine backed by
    an in-memory SQLite database pre-populated with synthetic data.

    Swap the connection string to a real DB URL for production:
        engine = create_engine("postgresql+psycopg2://user:pw@host/db")
    """
    rng = random.Random(RANDOM_SEED)

    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        "sqlite:///:memory:",
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    users        = _create_users(rng)
    items        = _create_items(rng)
    interactions = _create_interactions(rng, users, items)

    df_users        = pd.DataFrame(users)
    df_items        = pd.DataFrame(items)
    df_interactions = pd.DataFrame(interactions)

    with engine.connect() as conn:
        df_users.to_sql("users",        conn, if_exists="replace", index=False)
        df_items.to_sql("items",        conn, if_exists="replace", index=False)
        df_interactions.to_sql("interactions", conn, if_exists="replace", index=False)
        conn.commit()

    logger.info(
        "SQLite seeded: %d users | %d items | %d interactions",
        len(df_users), len(df_items), len(df_interactions),
    )
    return engine


# ─── ChromaDB Vector Store ────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_chroma_collection():
    """
    Returns (and lazily creates) the singleton ChromaDB collection
    populated with sentence-transformer embeddings for every item.

    Uses an **in-memory** ChromaDB client for development.
    For production, swap to:
        client = chromadb.HttpClient(host="chroma-host", port=8000)
        # or
        client = chromadb.PersistentClient(path="/path/to/persist")
    """
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise ImportError(
            "chromadb and sentence-transformers are required. "
            "Run: pip install chromadb sentence-transformers"
        ) from exc

    # ── Build items (same seed so IDs match the SQLite DB) ────────────────────
    rng   = random.Random(RANDOM_SEED)
    _create_users(rng)                          # advance RNG to keep seeds aligned
    items = _create_items(rng)

    # ── Embedding model ────────────────────────────────────────────────────────
    # To swap in a fine-tuned HuggingFace ranker, replace the model name:
    #   model = SentenceTransformer("your-org/your-finetuned-model")
    # Or use AutoModel directly:
    #   from transformers import AutoTokenizer, AutoModel
    #   tokenizer = AutoTokenizer.from_pretrained("your-org/your-model")
    #   model     = AutoModel.from_pretrained("your-org/your-model")
    EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    logger.info("Loading embedding model: %s", EMBED_MODEL)
    model = SentenceTransformer(EMBED_MODEL)

    # ── ChromaDB client + collection ──────────────────────────────────────────
    client     = chromadb.Client()          # in-memory; swap to PersistentClient for prod
    collection = client.get_or_create_collection(
        name="rec_items",
        metadata={"hnsw:space": "cosine"},  # cosine similarity for recommendations
    )

    # Only seed if not already populated (idempotent)
    if collection.count() == 0:
        descriptions = [it["description"] for it in items]
        item_ids     = [it["item_id"]     for it in items]

        logger.info("Embedding %d items — this may take a few seconds…", len(items))
        embeddings = model.encode(descriptions, show_progress_bar=False).tolist()

        # ChromaDB upsert in batches of 100
        batch_size = 100
        for start in range(0, len(items), batch_size):
            batch_slice = slice(start, start + batch_size)
            collection.upsert(
                ids        = item_ids[batch_slice],
                embeddings = embeddings[batch_slice],
                metadatas  = [
                    {
                        "name":            it["name"],
                        "category":        it["category"],
                        "price":           it["price"],
                        "margin_pct":      it["margin_pct"],
                        "inventory":       it["inventory"],
                        "avg_ctr":         it["avg_ctr"],
                        "listed_days_ago": it["listed_days_ago"],
                    }
                    for it in items[batch_slice]
                ],
                documents  = descriptions[batch_slice],
            )
        logger.info("ChromaDB seeded with %d item embeddings.", collection.count())

    return collection, model
