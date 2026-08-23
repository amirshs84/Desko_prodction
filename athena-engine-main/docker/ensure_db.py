"""Create the Athena Postgres database if this volume predates the init script."""

from __future__ import annotations

import os
import time

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def connect(dbname: str, *, attempts: int = 30):
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            return psycopg2.connect(
                host=os.environ["POSTGRES_SERVER"],
                port=os.environ.get("POSTGRES_PORT", "5432"),
                user=os.environ["POSTGRES_USER"],
                password=os.environ["POSTGRES_PASSWORD"],
                dbname=dbname,
            )
        except Exception as exc:  # noqa: BLE001 — retry until Postgres accepts connections
            last_error = exc
            time.sleep(1)
    raise SystemExit(f"could not connect to database {dbname!r}: {last_error}") from last_error


def main() -> None:
    target = os.environ["POSTGRES_DB"]
    admin_db = os.environ.get("POSTGRES_ADMIN_DB", "postgres")
    conn = connect(admin_db)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target,))
        if cur.fetchone() is None:
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target)))
            print(f"created database {target}", flush=True)
        else:
            print(f"database {target} already exists", flush=True)
    conn.close()


if __name__ == "__main__":
    main()
