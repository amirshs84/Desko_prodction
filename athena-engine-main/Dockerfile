ARG BASE_IMAGE=docker.arvancloud.ir/python:3.13-slim-bookworm
FROM ${BASE_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir -i https://mirror.arvancloud.ir/pypi/simple --trusted-host mirror.arvancloud.ir uv \
    || pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn uv \
    || pip install --no-cache-dir -i https://pypi.org/simple uv
RUN uv sync --frozen --no-dev --no-install-project --index-url https://mirror.arvancloud.ir/pypi/simple \
    || uv sync --frozen --no-dev --no-install-project --index-url https://pypi.tuna.tsinghua.edu.cn/simple \
    || uv sync --frozen --no-dev --no-install-project --index-url https://pypi.org/simple

COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
COPY docker/ensure_db.py /app/docker/ensure_db.py
RUN chmod +x /app/docker/entrypoint.sh

ENV PYTHONPATH=/app

EXPOSE 8001

ENTRYPOINT ["/bin/sh", "/app/docker/entrypoint.sh"]
CMD ["uv", "run", "--no-dev", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
