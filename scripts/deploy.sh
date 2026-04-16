#!/usr/bin/env bash
# Despliega manualmente la app actual al Droplet de DigitalOcean.
# Uso: ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
MAIN_ENV="$ROOT/infra/config/main.env"

err() {
  echo "ERROR: $*" >&2
  exit 1
}

[ -f "$ENV_FILE" ] || err "No existe .env — copia .env.example y completa los valores"
[ -f "$MAIN_ENV" ] || err "No existe infra/config/main.env"

set -a
source "$ENV_FILE"
source "$MAIN_ENV"
set +a

for required_var in DATABASE_URL AUTH_SECRET ANTHROPIC_API_KEY OPENAI_API_KEY NEXT_PUBLIC_APP_URL; do
  [ -n "${!required_var:-}" ] || err "Falta la variable requerida: $required_var"
done

command -v terraform >/dev/null 2>&1 || err "terraform no encontrado"
command -v scp >/dev/null 2>&1 || err "scp no encontrado"
command -v ssh >/dev/null 2>&1 || err "ssh no encontrado"

export AWS_ACCESS_KEY_ID="${DO_SPACES_ACCESS_KEY:-}"
export AWS_SECRET_ACCESS_KEY="${DO_SPACES_SECRET_KEY:-}"

DROPLET_IP="$(
  cd "$ROOT/infra/terraform" &&
    terraform output -raw droplet_ip 2>/dev/null
)"

[ -n "$DROPLET_IP" ] || err "No se pudo obtener la IP del Droplet. ¿Corriste infra-apply.sh?"

TMP_ENV="$(mktemp)"
cleanup() {
  rm -f "$TMP_ENV"
}
trap cleanup EXIT

{
  printf 'NEXT_PUBLIC_APP_URL=%s\n' "$NEXT_PUBLIC_APP_URL"
  printf 'DATABASE_URL=%s\n' "$DATABASE_URL"
  printf 'AUTH_SECRET=%s\n' "$AUTH_SECRET"
  printf 'ANTHROPIC_API_KEY=%s\n' "$ANTHROPIC_API_KEY"
  printf 'OPENAI_API_KEY=%s\n' "$OPENAI_API_KEY"

  [ -n "${RESEND_API_KEY:-}" ] && printf 'RESEND_API_KEY=%s\n' "$RESEND_API_KEY"
  [ -n "${EMAIL_FROM:-}" ] && printf 'EMAIL_FROM=%s\n' "$EMAIL_FROM"

  [ -n "${GOOGLE_CLIENT_ID:-}" ] && printf 'GOOGLE_CLIENT_ID=%s\n' "$GOOGLE_CLIENT_ID"
  [ -n "${GOOGLE_CLIENT_SECRET:-}" ] && printf 'GOOGLE_CLIENT_SECRET=%s\n' "$GOOGLE_CLIENT_SECRET"
  [ -n "${GOOGLE_REDIRECT_URI:-}" ] && printf 'GOOGLE_REDIRECT_URI=%s\n' "$GOOGLE_REDIRECT_URI"

  [ -n "${MICROSOFT_CLIENT_ID:-}" ] && printf 'MICROSOFT_CLIENT_ID=%s\n' "$MICROSOFT_CLIENT_ID"
  [ -n "${MICROSOFT_CLIENT_SECRET:-}" ] && printf 'MICROSOFT_CLIENT_SECRET=%s\n' "$MICROSOFT_CLIENT_SECRET"
  [ -n "${MICROSOFT_TENANT_ID:-}" ] && printf 'MICROSOFT_TENANT_ID=%s\n' "$MICROSOFT_TENANT_ID"
  [ -n "${MICROSOFT_REDIRECT_URI:-}" ] && printf 'MICROSOFT_REDIRECT_URI=%s\n' "$MICROSOFT_REDIRECT_URI"
} > "$TMP_ENV"

echo "→ Subiendo .env al Droplet $DROPLET_IP"
scp "$TMP_ENV" "root@$DROPLET_IP:/opt/ebuddy/.env"
ssh "root@$DROPLET_IP" "chmod 600 /opt/ebuddy/.env && /usr/local/bin/ebuddy-deploy"

echo "✓ Deploy completo → https://$DOMAIN_NAME"
