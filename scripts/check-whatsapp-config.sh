#!/usr/bin/env bash
# check-whatsapp-config.sh
# Verifica que las variables de entorno de WhatsApp Business API están
# configuradas y que el Phone Number ID es válido en la API de Meta.
#
# Uso:
#   WHATSAPP_API_TOKEN=EAAx... \
#   WHATSAPP_PHONE_NUMBER_ID=123456789 \
#   WHATSAPP_BUSINESS_ACCOUNT_ID=987654321 \
#     bash scripts/check-whatsapp-config.sh
#
# Exit code 0 = todo correcto, 1 = fallo.

set -euo pipefail

PASS=0
FAIL=0

ok()   { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; FAIL=$((FAIL + 1)); }

# ── 1. Variables requeridas ───────────────────────────────────
echo "=== Verificando variables de entorno ==="

for var in WHATSAPP_API_TOKEN WHATSAPP_PHONE_NUMBER_ID WHATSAPP_BUSINESS_ACCOUNT_ID; do
  if [ -n "${!var:-}" ]; then
    ok "$var está configurada"
    PASS=$((PASS + 1))
  else
    fail "$var no está configurada"
  fi
done

# Abortar si falta alguna variable — no tiene sentido seguir
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Resultado: $PASS PASS, $FAIL FAIL — configura las variables faltantes en GitHub Secrets"
  exit 1
fi

# ── 2. Verificar Phone Number ID en Meta Graph API ────────────
echo ""
echo "=== Verificando Phone Number ID en Meta API ==="

HTTP_STATUS=$(curl -sf \
  --max-time 15 \
  -o /dev/null \
  -w "%{http_code}" \
  "https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}" \
  -H "Authorization: Bearer ${WHATSAPP_API_TOKEN}")

if [ "$HTTP_STATUS" = "200" ]; then
  ok "Phone Number ID ${WHATSAPP_PHONE_NUMBER_ID} verificado en Meta API (HTTP 200)"
  PASS=$((PASS + 1))
else
  fail "Meta API retornó HTTP ${HTTP_STATUS} para Phone Number ID ${WHATSAPP_PHONE_NUMBER_ID}"
  fail "Verifica que el token tenga permisos whatsapp_business_messaging"
fi

# ── 3. Verificar Business Account ID ─────────────────────────
echo ""
echo "=== Verificando Business Account ID en Meta API ==="

HTTP_STATUS=$(curl -sf \
  --max-time 15 \
  -o /dev/null \
  -w "%{http_code}" \
  "https://graph.facebook.com/v19.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}" \
  -H "Authorization: Bearer ${WHATSAPP_API_TOKEN}")

if [ "$HTTP_STATUS" = "200" ]; then
  ok "Business Account ID ${WHATSAPP_BUSINESS_ACCOUNT_ID} verificado (HTTP 200)"
  PASS=$((PASS + 1))
else
  fail "Meta API retornó HTTP ${HTTP_STATUS} para Business Account ID ${WHATSAPP_BUSINESS_ACCOUNT_ID}"
fi

# ── Resultado final ───────────────────────────────────────────
echo ""
echo "=== Resultado: ${PASS} PASS, ${FAIL} FAIL ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

echo "✓ Configuración de WhatsApp Business API verificada correctamente"
