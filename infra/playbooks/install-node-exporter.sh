#!/usr/bin/env bash
# Instala node_exporter como servicio systemd (idempotente).
set -euo pipefail

VERSION="1.8.2"
ARCH="amd64"
BINARY="/usr/local/bin/node_exporter"
SERVICE="/etc/systemd/system/node_exporter.service"

if [[ -x "$BINARY" ]]; then
  INSTALLED="$("$BINARY" --version 2>&1 | awk '{print $3}' | head -1)"
  echo "node_exporter ya instalado: $INSTALLED"
  systemctl is-active --quiet node_exporter && echo "Servicio activo — nada que hacer" && exit 0
fi

TARBALL="node_exporter-${VERSION}.linux-${ARCH}.tar.gz"
URL="https://github.com/prometheus/node_exporter/releases/download/v${VERSION}/${TARBALL}"

echo "Descargando node_exporter v${VERSION}..."
cd /tmp
wget -q "$URL" -O "$TARBALL"
tar xzf "$TARBALL"
mv "node_exporter-${VERSION}.linux-${ARCH}/node_exporter" "$BINARY"
chmod +x "$BINARY"
rm -rf "$TARBALL" "node_exporter-${VERSION}.linux-${ARCH}"

cat > "$SERVICE" <<'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=root
ExecStart=/usr/local/bin/node_exporter
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now node_exporter

echo "✓ node_exporter v${VERSION} instalado y activo en :9100"
node_exporter --version 2>&1 | head -1
