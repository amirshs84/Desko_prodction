"""آزمون لایه‌ی کش (لایه ۱۷).

دکوراتورهای کش را مستقیم می‌سنجد: read-through (hit/miss)، negative caching، و
ابطال روی save. از یک CacheClient درون‌حافظه‌ای ساختگی استفاده می‌شود تا رفتار
مستقل از backend واقعی و قطعی باشد.
"""
from __future__ import annotations

from typing import Any
from uuid import uuid4

from django.test import SimpleTestCase

from Ai.domain.entities.ai_model import AIModel
from Ai.domain.entities.role_prompt_profile import RolePromptProfile
from Ai.domain.enums import Capability, UserRole
from Ai.infrastructure.cache.keys import CacheKeys
from Ai.infrastructure.persistence.repositories.caching_ai_model_repository import (
    CachingAIModelRepository,
)
from Ai.infrastructure.persistence.repositories.caching_role_prompt_profile_repository import (  # noqa: E501
    CachingRolePromptProfileRepository,
)


class FakeCache:
    """CacheClient ساختگی روی dict (بدون TTL واقعی)."""

    def __init__(self) -> None:
        self.store: dict[str, Any] = {}

    def get(self, key: str):
        return self.store.get(key)

    def set(self, key: str, value: Any, *, ttl_seconds=None) -> None:
        self.store[key] = value

    def delete(self, key: str) -> None:
        self.store.pop(key, None)

    def incr(self, key: str, amount: int = 1, *, ttl_seconds=None) -> int:
        self.store[key] = self.store.get(key, 0) + amount
        return self.store[key]

    def add(self, key: str, value: Any, *, ttl_seconds=None) -> bool:
        if key in self.store:
            return False
        self.store[key] = value
        return True


class _CountingModelRepo:
    def __init__(self, model: AIModel | None) -> None:
        self._model = model
        self.get_calls = 0

    def get(self, model_id):
        self.get_calls += 1
        return self._model

    def get_by_key(self, key):
        return self._model

    def list_active(self, *, capability=None):
        return [self._model] if self._model else []


def _make_model() -> AIModel:
    return AIModel(
        id=uuid4(),
        provider_key="fake",
        key="fake-1",
        display_name="Fake",
        context_window=8000,
        max_output_tokens=1024,
        capabilities=frozenset({Capability.CHAT}),
        priority=0,
        is_active=True,
    )


class ModelCacheTests(SimpleTestCase):
    def test_read_through_hits_db_once(self):
        model = _make_model()
        inner = _CountingModelRepo(model)
        repo = CachingAIModelRepository(
            inner, cache=FakeCache(), keys=CacheKeys("ai"), ttl_seconds=300
        )
        first = repo.get(model.id)
        second = repo.get(model.id)
        self.assertEqual(first.id, model.id)
        self.assertEqual(second.id, model.id)
        self.assertEqual(inner.get_calls, 1)  # بار دوم از کش

    def test_negative_caching(self):
        inner = _CountingModelRepo(None)
        repo = CachingAIModelRepository(
            inner, cache=FakeCache(), keys=CacheKeys("ai"), ttl_seconds=300
        )
        missing = uuid4()
        self.assertIsNone(repo.get(missing))
        self.assertIsNone(repo.get(missing))
        self.assertEqual(inner.get_calls, 1)  # miss هم کش شد

    def test_invalidate_forces_reload(self):
        model = _make_model()
        inner = _CountingModelRepo(model)
        repo = CachingAIModelRepository(
            inner, cache=FakeCache(), keys=CacheKeys("ai"), ttl_seconds=300
        )
        repo.get(model.id)
        repo.invalidate(model_id=model.id)
        repo.get(model.id)
        self.assertEqual(inner.get_calls, 2)  # پس از ابطال دوباره از DB


class _CountingProfileRepo:
    def __init__(self, profile: RolePromptProfile | None) -> None:
        self._profile = profile
        self.resolve_calls = 0
        self.saved: list = []

    def resolve(self, *, role, tenant_id):
        self.resolve_calls += 1
        return self._profile

    def get(self, profile_id):
        return self._profile

    def save(self, profile) -> None:
        self.saved.append(profile)


def _make_profile(tenant_id) -> RolePromptProfile:
    return RolePromptProfile(
        id=uuid4(),
        role=UserRole.STUDENT,
        system_prompt="پاسخ‌ها را ساده توضیح بده.",
        tenant_id=tenant_id,
    )


class ProfileCacheTests(SimpleTestCase):
    def test_resolve_cached(self):
        tenant = uuid4()
        profile = _make_profile(tenant)
        inner = _CountingProfileRepo(profile)
        repo = CachingRolePromptProfileRepository(
            inner, cache=FakeCache(), keys=CacheKeys("ai"), ttl_seconds=300
        )
        repo.resolve(role=UserRole.STUDENT, tenant_id=tenant)
        repo.resolve(role=UserRole.STUDENT, tenant_id=tenant)
        self.assertEqual(inner.resolve_calls, 1)

    def test_save_invalidates_resolve(self):
        tenant = uuid4()
        profile = _make_profile(tenant)
        inner = _CountingProfileRepo(profile)
        repo = CachingRolePromptProfileRepository(
            inner, cache=FakeCache(), keys=CacheKeys("ai"), ttl_seconds=300
        )
        repo.resolve(role=UserRole.STUDENT, tenant_id=tenant)
        repo.save(profile)  # باید کش resolve همان نقش/مستأجر را باطل کند
        repo.resolve(role=UserRole.STUDENT, tenant_id=tenant)
        self.assertEqual(inner.resolve_calls, 2)
