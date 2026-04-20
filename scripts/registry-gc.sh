#!/usr/bin/env bash
# registry-gc.sh — Limpieza operativa de DigitalOcean Container Registry

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v doctl >/dev/null 2>&1; then
  echo "ERROR: doctl no encontrado en PATH" >&2
  exit 2
fi

source infra/config/main.env

REGISTRY="${APP_NAME}-${ENVIRONMENT}"
REPO="${APP_NAME}"

echo "→ Limpiando tags antiguas en ${REGISTRY}/${REPO}"
doctl registry repository list-tags "$REGISTRY/$REPO" \
  --no-header --format Tag 2>/dev/null \
| grep -v -E "^(latest|migrator)$" \
| while read -r tag; do
    [ -n "$tag" ] || continue
    doctl registry repository delete-tag "$REGISTRY/$REPO" "$tag" --force
  done

echo "→ Iniciando garbage collection para $REGISTRY"
doctl registry garbage-collection start "$REGISTRY" \
  --force --include-untagged-manifests 2>&1 \
  | grep -v "only one active garbage collection" || true

MAX_WAIT=1200
WAITED=0
while true; do
  GC_STATUS="$(doctl registry garbage-collection list "$REGISTRY" --no-header 2>/dev/null | head -1)"
  [ -z "$GC_STATUS" ] && break
  echo "$GC_STATUS" | grep -qE "(succeeded|failed|cancelled)" && break
  echo "GC corriendo... (${WAITED}s): $(echo "$GC_STATUS" | awk '{print $3,$4,$5}')"
  sleep 30
  WAITED=$((WAITED + 30))
  [ "$WAITED" -ge "$MAX_WAIT" ] && { echo "Timeout esperando GC"; break; }
done

echo "✓ Registry GC completado"
