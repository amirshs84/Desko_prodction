ARG BASE_IMAGE=docker.arvancloud.ir/python:3.12-slim-bookworm
FROM ${BASE_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

COPY requirements.txt /app/
# Docker Hub / pypi.org often time out from Iranian hosts. Arvan first, then Tsinghua, then official.
RUN pip install --no-cache-dir -i https://mirror.arvancloud.ir/pypi/simple --trusted-host mirror.arvancloud.ir -r requirements.txt \
    || pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn -r requirements.txt \
    || pip install --no-cache-dir -i https://pypi.org/simple -r requirements.txt

COPY . /app/

RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["web"]
