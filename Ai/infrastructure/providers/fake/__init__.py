"""Fake Provider — برای توسعه/تست بدون شبکه."""
from .embedding import FakeEmbeddingProvider
from .provider import FakeChatProvider

__all__ = ["FakeChatProvider", "FakeEmbeddingProvider"]
