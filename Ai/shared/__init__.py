"""Shared Module — اجزای مشترک بین همه‌ی Bounded Context ها (Cross-Cutting).

برای رعایت Clean Architecture، این ماژول هم خودش لایه‌بندی شده است:
  - shared/domain         : پایه‌های خالص دامنه (بدون هیچ وابستگی بیرونی).
  - shared/application    : پایه‌های الگوی CQRS (Command/Query).
  - shared/infrastructure : ابزارهای مختص فریمورک (uuid7, Clock, Django mixins).

قاعده‌ی وابستگی همچنان برقرار است: shared/domain به هیچ چیز وابسته نیست،
shared/infrastructure می‌تواند به shared/domain وابسته باشد اما نه برعکس.
"""
