"""Entities — موجودیت‌های دامنه با هویت پایدار (identity).

اشیاء dataclass خالص پایتون که منطق و invariantهای خود را حمل می‌کنند؛ هیچ
ارتباطی با Django Model ندارند. موجودیت‌ها با ``@dataclass(eq=False)`` تعریف
شده‌اند تا برابری بر مبنای هویت (از Entity پایه) حفظ شود.
"""
from .ai_model import AIModel
from .attachment import Attachment
from .conversation import Conversation
from .conversation_summary import ConversationSummary
from .message import Message
from .message_version import MessageVersion
from .role_prompt_profile import RolePromptProfile
from .usage_record import UsageRecord

__all__ = [
    "AIModel",
    "Attachment",
    "Conversation",
    "ConversationSummary",
    "Message",
    "MessageVersion",
    "RolePromptProfile",
    "UsageRecord",
]
