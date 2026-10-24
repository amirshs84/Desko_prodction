"""ساخت ``NotificationContent`` از قالب + context + override ها (مشترک بین push و local)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..domain.entities import NotificationTemplate
from ..domain.errors import InvalidNotification, NotFound
from ..domain.repositories import TemplateRepository
from ..domain.value_objects import NotificationContent
from .ports import TemplateRenderer


@dataclass(frozen=True)
class BuiltContent:
    content: NotificationContent
    deeplink: str | None
    template: NotificationTemplate | None


class ContentFactory:
    def __init__(self, templates: TemplateRepository, renderer: TemplateRenderer) -> None:
        self._templates = templates
        self._renderer = renderer

    def build(
        self,
        *,
        template_key: str | None,
        locale: str,
        context: dict[str, Any],
        title: str | None,
        body: str | None,
        content_options: dict[str, Any],
        deeplink: str | None,
    ) -> BuiltContent:
        template = None
        options: dict[str, Any] = {}
        if template_key:
            template = self._templates.get(template_key, locale)
            if template is None:
                raise NotFound(f"قالب {template_key!r} یافت نشد.")
            options = dict(template.content_options)
            title = title or template.title
            body = body if body is not None else template.body
            deeplink = deeplink or template.deeplink
        if not title:
            raise InvalidNotification("title یا template_key لازم است.")

        options.update(content_options or {})
        render = lambda s: self._renderer.render(s, context) if s else s  # noqa: E731
        options["title"] = render(title)
        options["body"] = render(body or "")
        if options.get("actions"):
            options["actions"] = [
                {**a, "title": render(a["title"]), "deeplink": render(a.get("deeplink"))}
                for a in options["actions"]
            ]
        if options.get("lines"):
            options["lines"] = [render(line) for line in options["lines"]]
        return BuiltContent(
            content=NotificationContent.from_dict(options),
            deeplink=render(deeplink) if deeplink else None,
            template=template,
        )
