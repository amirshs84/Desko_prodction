ARG BASE_IMAGE=python:3.12-slim-bookworm
FROM ${BASE_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

COPY requirements.txt ./
# Wheel-only: the uv.lock was generated for Python 3.13 and compiling sdists
# (psycopg2, markupsafe, …) fails on slim images / flaky Iranian mirrors.
RUN pip install --no-cache-dir --only-binary=:all: -i https://mirror.arvancloud.ir/pypi/simple --trusted-host mirror.arvancloud.ir -r requirements.txt \
    || pip install --no-cache-dir --only-binary=:all: -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn -r requirements.txt \
    || pip install --no-cache-dir --only-binary=:all: -i https://pypi.org/simple -r requirements.txt

COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
COPY docker/ensure_db.py /app/docker/ensure_db.py
RUN chmod +x /app/docker/entrypoint.sh

ENV PYTHONPATH=/app

EXPOSE 8001

ENTRYPOINT ["/bin/sh", "/app/docker/entrypoint.sh"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
