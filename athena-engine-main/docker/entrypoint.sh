#!/bin/sh
set -eu
if [ "${ATHENA_MIGRATE:-1}" = "1" ]; then
  uv run --no-dev alembic upgrade head
fi
exec "$@"
