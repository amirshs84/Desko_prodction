#!/bin/sh
# استقرار روی سرور — از ریشه پروژه اجرا کنید: sh deploy.sh
set -e

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "=== .env پیدا نشد — از .env.example ساخته می‌شود ==="
    cp .env.example .env
  else
    echo "فایل .env وجود ندارد. اول .env.example را کپی کنید: cp .env.example .env"
    exit 1
  fi
fi

# BuildKit: cache mounts in Dockerfiles (pip/npm) survive a failed layer.
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "=== 1. Build images (layer cache kept; do not pass --no-cache) ==="
docker compose build web frontend athena

echo "=== 2. Restart containers ==="
docker compose up -d

echo "=== 3. Run migrations (service name: web) ==="
docker compose exec web python manage.py migrate --noinput

echo "=== 4. Migration status ==="
docker compose exec web python manage.py showmigrations api

echo "=== Done ==="
docker compose ps
