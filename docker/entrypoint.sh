#!/bin/sh
set -e

case "$1" in
  web)
    python manage.py migrate --noinput
    python manage.py seed_ai_model
    python manage.py collectstatic --noinput
    mkdir -p "${MEDIA_ROOT:-/app/media}/exam_booklets"
    exec gunicorn desko_backend.wsgi:application \
      --bind 0.0.0.0:8000 \
      --worker-class gthread \
      --workers "${WEB_CONCURRENCY:-3}" \
      --threads "${GUNICORN_THREADS:-8}" \
      --keep-alive 75 \
      --timeout 120
    ;;
  worker)
    exec celery -A desko_backend worker \
      -l info \
      -Q ai_generation,file_ingestion,embeddings,maintenance
    ;;
  notif-worker)
    # notif_critical اول لیست است تا در رقابت با صف‌های دیگر زودتر برداشته شود.
    exec celery -A desko_backend worker \
      -l info \
      -n notif@%h \
      -Q notif_critical,notif_default,notif_bulk \
      --concurrency "${NOTIF_WORKER_CONCURRENCY:-4}"
    ;;
  asgi)
    exec daphne -b 0.0.0.0 -p 8002 desko_backend.asgi:application
    ;;
  beat)
    exec celery -A desko_backend beat -l info
    ;;
  *)
    exec "$@"
    ;;
esac
