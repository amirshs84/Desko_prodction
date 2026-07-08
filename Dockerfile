FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_INDEX_URL=https://mirror-pypi.runflare.com/simple \
    PIP_TRUSTED_HOST=mirror-pypi.runflare.com \
    PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

RUN printf '%s\n' \
    '[global]' \
    'index-url = https://mirror-pypi.runflare.com/simple' \
    'trusted-host = mirror-pypi.runflare.com' \
    'timeout = 120' \
    > /etc/pip.conf

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["web"]
