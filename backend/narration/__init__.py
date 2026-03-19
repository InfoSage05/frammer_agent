"""Narration Agent module."""
from .narrator import (
    narrate_results,
    narrate_error,
    generate_follow_up_suggestions,
    summarize_kpis
)

__all__ = [
    "narrate_results",
    "narrate_error",
    "generate_follow_up_suggestions",
    "summarize_kpis"
]
