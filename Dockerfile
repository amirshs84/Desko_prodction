ARG BASE_IMAGE=python:3.12-slim-bookworm
FROM ${BASE_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_DEFAULT_TIMEOUT=60

WORKDIR /app

COPY requirements.txt /app/
# Keep pip's download cache so a failed mirror (or a failed later layer) does not
# force a full re-download. First index fails fast; fallbacks reuse the cache.
# Cache mount needs BuildKit (Docker 23+ default).
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --cache-dir /root/.cache/pip --timeout 15 \
      -i https://mirror.arvancloud.ir/pypi/simple --trusted-host mirror.arvancloud.ir \
      -r requirements.txt \
    || pip install --cache-dir /root/.cache/pip --timeout 60 \
      -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn \
      -r requirements.txt \
    || pip install --cache-dir /root/.cache/pip --timeout 120 \
      -i https://pypi.org/simple \
      -r requirements.txt

COPY . /app/

RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["web"]
