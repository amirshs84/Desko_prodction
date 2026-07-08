"""ثبت (seed) یک مدل هوش مصنوعی در رجیستری — idempotent.

مدل‌ها config-driven هستند (در دیتابیس، نه hardcode). برای اینکه اپ بتواند پاسخ
تولید کند، حداقل یک ردیف فعال در جدول ``ai_model`` لازم است. این دستور رکورد مدل
پیش‌فرض (از ``settings.AI_DEFAULT_MODEL_KEY``) را می‌سازد یا به‌روزرسانی می‌کند.

نمونه:
    python manage.py seed_ai_model
    python manage.py seed_ai_model --key gpt-4o --context-window 128000
"""
from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand

from Ai.container import get_container
from Ai.infrastructure.persistence.models import AIModelModel


class Command(BaseCommand):
    help = "ثبت/به‌روزرسانی یک مدل هوش مصنوعی در رجیستری (idempotent)."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--provider",
            default="openai",
            help="کلید Provider (پیش‌فرض: openai — سازگار با GapGPT/AvalAI).",
        )
        parser.add_argument(
            "--key",
            default=getattr(settings, "AI_DEFAULT_MODEL_KEY", "gpt-4o-mini"),
            help="نام مدل نزد Provider (مثلاً gpt-4o-mini).",
        )
        parser.add_argument("--display-name", default="")
        parser.add_argument("--context-window", type=int, default=128000)
        parser.add_argument("--max-output-tokens", type=int, default=4096)

    def handle(self, *args, **options) -> None:
        key = options["key"]
        display_name = options["display_name"] or key
        obj, created = AIModelModel.objects.update_or_create(
            key=key,
            defaults={
                "provider_key": options["provider"],
                "display_name": display_name,
                "context_window": options["context_window"],
                "max_output_tokens": options["max_output_tokens"],
                "capabilities": ["chat"],
                "priority": 100,
                "is_active": True,
            },
        )

        # ابطال کش رجیستری مدل تا تغییر بلافاصله دیده شود (سازگاری با لایه‌ی کش).
        repo = get_container().model_repo
        if hasattr(repo, "invalidate"):
            repo.invalidate(model_id=obj.id, key=obj.key)

        verb = "ساخته شد" if created else "به‌روزرسانی شد"
        self.stdout.write(
            self.style.SUCCESS(
                f"مدل «{obj.key}» ({obj.provider_key}) {verb}. "
                f"model_id = {obj.id}"
            )
        )
