# syntax=docker/dockerfile:1
FROM python:3.12-slim
WORKDIR /app
COPY camera/requirements*.txt camera/
# CPU runtime. Explicit platform CA secret is used only during dependency installation.
RUN --mount=type=secret,id=proxy_ca \
    set -eu; \
    if [ -f /run/secrets/proxy_ca ]; then \
      cat /etc/ssl/certs/ca-certificates.crt /run/secrets/proxy_ca > /tmp/build-ca.pem; \
      export PIP_CERT=/tmp/build-ca.pem; \
    fi; \
    pip install --no-cache-dir torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cpu; \
    pip install --no-cache-dir -r camera/requirements-model.txt; \
    rm -f /tmp/build-ca.pem
COPY camera/ camera/
ENV YOLO_CONFIG_DIR=/tmp/nivect-yolo
USER 10001:10001
EXPOSE 9000
CMD ["uvicorn", "camera.server:app", "--host", "0.0.0.0", "--port", "9000"]
