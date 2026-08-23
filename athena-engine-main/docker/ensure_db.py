"""Create the Athena Postgres database if this volume predates the init script."""

from __future__ import annotations

import asyncio
import os
import re

import asyncpg


def _ident(name: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise SystemExit(f"invalid database name: {name!r}")
    return name


async def connect(dbname: str, *, attempts: int = 30) -> asyncpg.Connection:
    last_error: Exception | None = None
    for _ in range(attempts):
        try:
            return await asyncpg.connect(
                host=os.environ["POSTGRES_SERVER"],
                port=int(os.environ.get("POSTGRES_PORT", "5432")),
                user=os.environ["POSTGRES_USER"],
                password=os.environ["POSTGRES_PASSWORD"],
                database=dbname,
            )
        except Exception as exc:  # noqa: BLE001 — retry until Postgres accepts connections
            last_error = exc
            await asyncio.sleep(1)
    raise SystemExit(f"could not connect to database {dbname!r}: {last_error}") from last_error


async def main() -> None:
    target = _ident(os.environ["POSTGRES_DB"])
    admin_db = _ident(os.environ.get("POSTGRES_ADMIN_DB", "postgres"))
    conn = await connect(admin_db)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            target,
        )
        if exists is None:
            await conn.execute(f"CREATE DATABASE {target}")
            print(f"created database {target}", flush=True)
        else:
            print(f"database {target} already exists", flush=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
