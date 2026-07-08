"""Value Objects — اشیاء مقداری تغییرناپذیر (immutable) بدون هویت.

دو Value Object وقتی برابرند که همه‌ی مقادیرشان برابر باشد (equality by value).
"""
from .flags import ConversationFlags
from .model_config import ModelConfig
from .storage_ref import StorageRef
from .token_usage import TokenUsage

__all__ = [
    "ConversationFlags",
    "ModelConfig",
    "StorageRef",
    "TokenUsage",
]
