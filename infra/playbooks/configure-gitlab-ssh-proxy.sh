#!/usr/bin/env bash
set -euo pipefail

ELITEMINI_IP="100.80.59.3"
PROXY_PORT="2222"

apt-get install -y socat

cat > /etc/systemd/system/gitlab-ssh-proxy.service << EOF
[Unit]
Description=GitLab SSH proxy → elitemini
After=network.target

[Service]
ExecStart=/usr/bin/socat TCP4-LISTEN:${PROXY_PORT},fork,reuseaddr TCP4:${ELITEMINI_IP}:22
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable gitlab-ssh-proxy
systemctl restart gitlab-ssh-proxy

echo "✓ GitLab SSH proxy activo en puerto ${PROXY_PORT} → elitemini ${ELITEMINI_IP}:22"
