"""Enum های دامنه — واژگان بسته‌ی کسب‌وکار.

اینها ``str, Enum`` هستند تا هم type-safe باشند و هم مقدارشان مستقیماً
serializable و قابل ذخیره در دیتابیس باشد (بدون نگاشت اضافه).
"""
from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    """نقش نویسنده‌ی هر پیام در مکالمه (نه نقش کاربر سیستم)."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class MessageStatus(str, Enum):
    """چرخه‌ی وضعیت پیام (عمدتاً برای پیام‌های assistant/tool).

    پیام‌های کاربر مستقیماً COMPLETED هستند.
    گذارهای مجاز در خود Message.enforce می‌شوند.
    """

    PENDING = "pending"
    STREAMING = "streaming"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ConversationStatus(str, Enum):
    """چرخه‌ی عمر مکالمه."""

    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class ParseStatus(str, Enum):
    """وضعیت پردازش پیوست تا آماده‌ی RAG شدن."""

    UPLOADED = "uploaded"
    PARSING = "parsing"
    PARSED = "parsed"
    CHUNKED = "chunked"
    EMBEDDED = "embedded"
    FAILED = "failed"


class FileType(str, Enum):
    """انواع فایل پشتیبانی‌شده برای پیوست."""

    PDF = "pdf"
    DOCX = "docx"
    XLSX = "xlsx"
    TXT = "txt"
    ZIP = "zip"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


class Capability(str, Enum):
    """قابلیت‌های یک مدل هوش مصنوعی؛ مبنای routing در ProviderFactory."""

    CHAT = "chat"
    VISION = "vision"
    TOOLS = "tools"
    EMBEDDING = "embedding"
    SPEECH_TO_TEXT = "speech_to_text"


class UserRole(str, Enum):
    """نقش کاربر که پروفایل system prompt را تعیین می‌کند (نیازمندی صریح).

    هر نقش، system prompt و پارامترهای متفاوتی به درخواست هوش مصنوعی تزریق می‌کند.
    """

    STUDENT = "student"
    TEACHER = "teacher"
    CONSULTANT = "consultant"
    MANAGER = "manager"
