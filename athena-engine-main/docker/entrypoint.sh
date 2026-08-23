#!/bin/sh
set -eu

uv run --no-dev python /app/docker/ensure_db.py

if [ "${ATHENA_MIGRATE:-1}" = "1" ]; then
  uv run --no-dev alembic upgrade head
fi

exec "$@"
