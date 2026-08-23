FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

COPY requirements.txt /app/
# Runflare PyPI started returning 402 Payment Required. Try official first,
# then Arvan (Iran) and Tsinghua so builds still work from restricted networks.
RUN pip install --no-cache-dir -i https://pypi.org/simple -r requirements.txt \
    || pip install --no-cache-dir -i https://mirror.arvancloud.ir/pypi/simple --trusted-host mirror.arvancloud.ir -r requirements.txt \
    || pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn -r requirements.txt

COPY . /app/

RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["web"]
