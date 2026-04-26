FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    git \
    gnupg \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Docker CE CLI — para jobs que construyen imágenes
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
       | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/debian bookworm stable" \
       | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Python — deps de CI preinstaladas
RUN pip install --no-cache-dir \
    pytest>=8.0 \
    pytest-cov>=5.0 \
    jinja2>=3.1 \
    pyyaml \
    ansible-core

WORKDIR /workspace
