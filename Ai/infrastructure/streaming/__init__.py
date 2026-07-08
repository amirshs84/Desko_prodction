"""Streaming adapters — حامل رویداد استریم + runner تولید."""
from .in_memory import InMemoryStreamTransport
from .runner import GenerationRunner
from .serialization import (
    context_from_dict,
    context_to_dict,
    event_from_dict,
    event_to_dict,
)

__all__ = [
    "GenerationRunner",
    "InMemoryStreamTransport",
    "context_from_dict",
    "context_to_dict",
    "event_from_dict",
    "event_to_dict",
]
