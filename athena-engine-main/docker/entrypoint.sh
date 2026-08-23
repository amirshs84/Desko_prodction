#!/bin/sh
set -eu

key_file="${JWT_PUBLIC_KEY_FILE:-/keys/athena-public.pem}"
if [ ! -s "$key_file" ]; then
  echo "Athena JWT public key missing: $key_file" >&2
  echo "Copy docker/jwt/athena-public.pem (and the matching private key for Django) onto the server." >&2
  exit 1
fi

python /app/docker/ensure_db.py

if [ "${ATHENA_MIGRATE:-1}" = "1" ]; then
  alembic upgrade head
fi

exec "$@"
