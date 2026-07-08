#!/bin/sh
set -e

case "$1" in
  web)
    python manage.py migrate --noinput
    python manage.py seed_ai_model
    python manage.py collectstatic --noinput
    exec gunicorn desko_backend.wsgi:application \
      --bind 0.0.0.0:8000 \
      --keep-alive 75 \
      --timeout 120
    ;;
  worker)
    exec celery -A desko_backend worker \
      -l info \
      -Q ai_generation,file_ingestion,embeddings,maintenance
    ;;
  beat)
    exec celery -A desko_backend beat -l info
    ;;
  *)
    exec "$@"
    ;;
esac
