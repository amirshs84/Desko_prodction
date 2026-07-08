"""Application Layer — لایه‌ی Use-Case / Service.

این لایه سناریوهای کاربردی (use-case) را هماهنگ می‌کند:
  - Service ها منطق کسب‌وکار سطح برنامه را اجرا می‌کنند (مثل ارسال پیام).
  - از طریق interface به دامنه و ports وصل می‌شود، نه پیاده‌سازی مشخص.
  - هیچ منطق کسب‌وکاری اینجا با Django View جفت نمی‌شود.

وابستگی مجاز: application -> domain.
وابستگی ممنوع: application -> infrastructure / interfaces.
"""
