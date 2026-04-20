#!/usr/bin/env bash
# Instala y autentica Tailscale (idempotente).
# Requiere: TAILSCALE_AUTH_KEY en entorno.
set -euo pipefail

if command -v tailscale &>/dev/null && tailscale status &>/dev/null; then
  echo "Tailscale ya activo:"
  tailscale status --self
  exit 0
fi

echo "Instalando Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh

echo "Autenticando con auth key..."
tailscale up --authkey="${TAILSCALE_AUTH_KEY}" --accept-routes

echo "✓ Tailscale activo:"
tailscale status --self
