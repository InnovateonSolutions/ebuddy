#!/usr/bin/env bash
# scripts/e2e/smoke.sh — Smoke tests E2E contra producción
#
# Uso:
#   APP_URL=https://ebuddy.innovateoncorp.com bash scripts/e2e/smoke.sh
#
# Exit code 0 = todos los checks pasan, 1 = alguno falla.

set -euo pipefail

APP_URL="${APP_URL:-}"
if [ -z "$APP_URL" ]; then
  echo "ERROR: APP_URL env var requerida"
  exit 1
fi

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"   # "ok" | cualquier otro valor = fallo
  local detail="$3"
  if [ "$result" = "ok" ]; then
    echo "PASS [$name]: $detail"
    PASS=$((PASS + 1))
  else
    echo "FAIL [$name]: $detail" >&2
    FAIL=$((FAIL + 1))
  fi
}

# ── Health check ──────────────────────────────────────────────────────────────

HEALTH_BODY=$(curl -sf "$APP_URL/api/health" || echo "")
if echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  check "health /api/health" "ok" "$HEALTH_BODY"
else
  check "health /api/health" "fail" "body: $HEALTH_BODY"
fi

# ── Login page accesible ──────────────────────────────────────────────────────

LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/login")
if [ "$LOGIN_STATUS" = "200" ]; then
  check "login page" "ok" "HTTP 200"
else
  check "login page" "fail" "HTTP $LOGIN_STATUS (expected 200)"
fi

# ── Rutas protegidas rechazan sin autenticación ───────────────────────────────

TICKETS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/tickets/today")
if [ "$TICKETS_STATUS" = "401" ]; then
  check "auth /api/tickets/today" "ok" "HTTP 401"
else
  check "auth /api/tickets/today" "fail" "HTTP $TICKETS_STATUS (expected 401)"
fi

# ── Raíz redirige correctamente ───────────────────────────────────────────────

ROOT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$APP_URL/")
if [ "$ROOT_STATUS" = "200" ]; then
  check "root redirect" "ok" "HTTP 200 after redirect"
else
  check "root redirect" "fail" "HTTP $ROOT_STATUS (expected 200)"
fi

# ── Redirect HTTP → HTTPS (KAN-12) ───────────────────────────────────────────

HTTP_URL="${APP_URL/https:\/\//http://}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$HTTP_URL/" || echo "000")
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "308" ]; then
  check "HTTP→HTTPS redirect" "ok" "HTTP $HTTP_STATUS"
else
  check "HTTP→HTTPS redirect" "fail" "HTTP $HTTP_STATUS (expected 301 or 308)"
fi

# ── Security headers (KAN-12) ─────────────────────────────────────────────────

HEADERS=$(curl -sI "$APP_URL/api/health")

if echo "$HEADERS" | grep -qi "x-frame-options: DENY"; then
  check "header X-Frame-Options" "ok" "DENY"
else
  check "header X-Frame-Options" "fail" "missing or wrong value"
fi

if echo "$HEADERS" | grep -qi "x-content-type-options: nosniff"; then
  check "header X-Content-Type-Options" "ok" "nosniff"
else
  check "header X-Content-Type-Options" "fail" "missing or wrong value"
fi

if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  check "header Strict-Transport-Security" "ok" "present"
else
  check "header Strict-Transport-Security" "fail" "missing (HSTS required)"
fi

if echo "$HEADERS" | grep -qi "referrer-policy"; then
  check "header Referrer-Policy" "ok" "present"
else
  check "header Referrer-Policy" "fail" "missing"
fi

# ── API key endpoint rechaza sin autenticación (KAN-29) ──────────────────────

APIKEY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$APP_URL/api/user/api-key")
if [ "$APIKEY_STATUS" = "401" ]; then
  check "auth /api/user/api-key" "ok" "HTTP 401"
else
  check "auth /api/user/api-key" "fail" "HTTP $APIKEY_STATUS (expected 401)"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────

echo ""
echo "─────────────────────────────────────"
echo "Resultado: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
