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
| { grep -v -E "^(latest|migrator)$" || true; } \
| while read -r tag; do
    [ -n "$tag" ] || continue
    doctl registry repository delete-tag "$REGISTRY/$REPO" "$tag" --force
  done

echo "→ Iniciando garbage collection para $REGISTRY"
doctl registry garbage-collection start "$REGISTRY" \
  --force --include-untagged-manifests --output json 2>/dev/null \
  | python3 -c '
import json, sys
raw = sys.stdin.read().strip()
if not raw:
    sys.exit(0)
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    print(raw)
    sys.exit(0)
if isinstance(data, list):
    item = data[0] if data else {}
else:
    item = data
uuid = item.get("uuid") or item.get("UUID") or "desconocido"
status = item.get("status") or item.get("Status") or "requested"
print(f"GC solicitada: uuid={uuid} status={status}")
' || true

read_gc_json_field() {
  local json_payload="$1"
  local field="$2"

  python3 - "$field" <<'PY' <<<"$json_payload"
import json
import sys

field = sys.argv[1]
raw = sys.stdin.read().strip()
if not raw:
    sys.exit(1)

data = json.loads(raw)
if isinstance(data, list):
    if not data:
        sys.exit(1)
    item = data[0]
else:
    item = data

aliases = {
    "uuid": ["uuid", "UUID"],
    "status": ["status", "Status"],
    "updated_at": ["updated_at", "UpdatedAt"],
    "blobs_deleted": ["blobs_deleted", "BlobsDeleted"],
    "freed_bytes": ["freed_bytes", "FreedBytes"],
}

for key in aliases.get(field, [field]):
    value = item.get(key)
    if value not in (None, ""):
        print(value)
        break
PY
}

MAX_WAIT=1200
WAITED=0
while true; do
  GC_STATUS_JSON="$(doctl registry garbage-collection get-active --output json 2>/dev/null || true)"
  [ -z "$GC_STATUS_JSON" ] && break
  [ "$GC_STATUS_JSON" = "[]" ] && break

  STATUS="$(read_gc_json_field "$GC_STATUS_JSON" status 2>/dev/null || true)"
  UUID="$(read_gc_json_field "$GC_STATUS_JSON" uuid 2>/dev/null || true)"
  UPDATED_AT="$(read_gc_json_field "$GC_STATUS_JSON" updated_at 2>/dev/null || true)"
  BLOBS_DELETED="$(read_gc_json_field "$GC_STATUS_JSON" blobs_deleted 2>/dev/null || echo 0)"
  FREED_BYTES="$(read_gc_json_field "$GC_STATUS_JSON" freed_bytes 2>/dev/null || echo 0)"

  echo "GC activa... (${WAITED}s): status=${STATUS:-desconocido} uuid=${UUID:-desconocido} updated_at=${UPDATED_AT:-n/a} blobs_deleted=${BLOBS_DELETED:-0} freed_bytes=${FREED_BYTES:-0}"
  sleep 30
  WAITED=$((WAITED + 30))
  [ "$WAITED" -ge "$MAX_WAIT" ] && { echo "Timeout esperando GC"; break; }
done

FINAL_STATUS_JSON="$(doctl registry garbage-collection list "$REGISTRY" --output json 2>/dev/null || true)"
if [ -n "$FINAL_STATUS_JSON" ] && [ "$FINAL_STATUS_JSON" != "[]" ]; then
  FINAL_STATUS="$(read_gc_json_field "$FINAL_STATUS_JSON" status 2>/dev/null || true)"
  FINAL_UUID="$(read_gc_json_field "$FINAL_STATUS_JSON" uuid 2>/dev/null || true)"
  FINAL_BLOBS="$(read_gc_json_field "$FINAL_STATUS_JSON" blobs_deleted 2>/dev/null || echo 0)"
  FINAL_FREED="$(read_gc_json_field "$FINAL_STATUS_JSON" freed_bytes 2>/dev/null || echo 0)"
  echo "Estado final GC: status=${FINAL_STATUS:-desconocido} uuid=${FINAL_UUID:-desconocido} blobs_deleted=${FINAL_BLOBS:-0} freed_bytes=${FINAL_FREED:-0}"
fi

echo "✓ Registry GC completado"
