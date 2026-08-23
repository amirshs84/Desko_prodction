#!/bin/sh
set -eu

python /app/docker/ensure_db.py

if [ "${ATHENA_MIGRATE:-1}" = "1" ]; then
  alembic upgrade head
fi

exec "$@"
