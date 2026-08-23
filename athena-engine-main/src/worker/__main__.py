"""Worker process entry: python -m src.worker <name>"""

from __future__ import annotations

import argparse
import asyncio
import logging

from src.worker import (
    run_exam_session_status_worker,
    run_session_attempt_grading_worker,
    run_session_attempt_status_worker,
)

_WORKERS = {
    "exam_session_status": run_exam_session_status_worker,
    "session_attempt_status": run_session_attempt_status_worker,
    "session_attempt_grading": run_session_attempt_grading_worker,
}


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    parser = argparse.ArgumentParser(description="Athena background workers")
    parser.add_argument("worker", choices=sorted(_WORKERS))
    args = parser.parse_args()
    asyncio.run(_WORKERS[args.worker]())


if __name__ == "__main__":
    main()
