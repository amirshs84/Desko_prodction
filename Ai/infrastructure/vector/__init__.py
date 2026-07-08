"""Vector Store — آداپتور جست‌وجوی برداری/RAG.

``DjangoVectorStore`` نسخه‌ی dev/تست (brute-force روی JSON، سازگار با SQLite)؛
در prod با آداپتور pgvector پشت همان Port ``VectorStore`` جایگزین می‌شود.
ایزولاسیون tenant در همه‌ی queryها اجباری است.
"""
from .chunker import TextChunker
from .django_vector_store import DjangoVectorStore

__all__ = ["DjangoVectorStore", "TextChunker"]
