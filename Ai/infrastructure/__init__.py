"""Infrastructure Layer — جزئیات فنی و پیاده‌سازی‌های وابسته به فریمورک.

اینجا محل اتصال به دنیای بیرون است:
  - persistence: پیاده‌سازی Repository ها با Django ORM.
  - providers: آداپتورهای ایزوله‌ی هر Provider هوش مصنوعی + Factory.
  - vector: آداپتور pgvector برای RAG.
  - storage: آداپتور Object Storage (S3/MinIO).
  - tasks: Celery task ها.

این لایه interfaceهای domain/application را «implement» می‌کند
(جهت وابستگی معکوس). لایه‌های بالاتر هرگز به جزئیات اینجا وابسته نیستند.
"""
