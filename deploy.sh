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

echo "=== 1. Build images (backend + frontend) ==="
docker-compose build --no-cache backend frontend

echo "=== 2. Restart containers ==="
docker-compose up -d

echo "=== 3. Run migrations (service name: backend) ==="
docker-compose exec backend python manage.py migrate --noinput

echo "=== 4. Migration status ==="
docker-compose exec backend python manage.py showmigrations api

echo "=== Done ==="
docker-compose ps
