#!/bin/bash
set -euo pipefail
# Runs only on first Postgres data-dir init. Athena also creates this DB at startup
# for existing volumes.
if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = 'athena'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "CREATE DATABASE athena"
fi
