#!/usr/bin/env bash
# setup-secrets.sh — Configura GitHub Secrets y Variables del stack actual.
#
# Uso:
#   cp .bootstrap.env.example .bootstrap.env
#   ./scripts/setup-secrets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP_ENV="$ROOT/.bootstrap.env"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✓${NC}  $*"; }
err() { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

[ -f "$BOOTSTRAP_ENV" ] || err "No existe .bootstrap.env — cópialo desde .bootstrap.env.example"
command -v gh >/dev/null 2>&1 || err "gh no encontrado"
gh auth status >/dev/null 2>&1 || err "gh no autenticado — corre: gh auth login"

set -a
source "$BOOTSTRAP_ENV"
set +a

for required_var in DO_TOKEN DO_SPACES_ACCESS_KEY DO_SPACES_SECRET_KEY DATABASE_URL AUTH_SECRET ANTHROPIC_API_KEY OPENAI_API_KEY NEXT_PUBLIC_APP_URL; do
  [ -n "${!required_var:-}" ] || err "Falta la variable requerida: $required_var"
done

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)" \
  || err "No estás dentro de un repo de GitHub. Corre desde /home/mct/opt/personal/IA-Secretary"

echo "→ Configurando $REPO"

SSH_KEY="$HOME/.ssh/ebuddy-deploy"
if [ ! -f "$SSH_KEY" ]; then
  ssh-keygen -t ed25519 -C "ebuddy-deploy" -f "$SSH_KEY" -N ""
  ok "SSH key generada en $SSH_KEY"
else
  ok "SSH key ya existe en $SSH_KEY"
fi

echo ""
echo "→ Subiendo Secrets..."
gh secret set DO_TOKEN --body "$DO_TOKEN"
gh secret set DO_SPACES_ACCESS_KEY --body "$DO_SPACES_ACCESS_KEY"
gh secret set DO_SPACES_SECRET_KEY --body "$DO_SPACES_SECRET_KEY"
gh secret set DO_SSH_PRIVATE_KEY --body "$(cat "$SSH_KEY")"
gh secret set DATABASE_URL --body "$DATABASE_URL"
gh secret set AUTH_SECRET --body "$AUTH_SECRET"
gh secret set ANTHROPIC_API_KEY --body "$ANTHROPIC_API_KEY"
gh secret set OPENAI_API_KEY --body "$OPENAI_API_KEY"

[ -n "${DO_MONITORING_TOKEN:-}" ] && gh secret set DO_MONITORING_TOKEN --body "$DO_MONITORING_TOKEN"
[ -n "${CRON_SECRET:-}" ] && gh secret set CRON_SECRET --body "$CRON_SECRET"
[ -n "${RESEND_API_KEY:-}" ] && gh secret set RESEND_API_KEY --body "$RESEND_API_KEY"
[ -n "${EMAIL_FROM:-}" ] && gh secret set EMAIL_FROM --body "$EMAIL_FROM"
[ -n "${OLLAMA_BASE_URL:-}" ] && gh secret set OLLAMA_BASE_URL --body "$OLLAMA_BASE_URL"
[ -n "${OPENCLAW_BASE_URL:-}" ] && gh secret set OPENCLAW_BASE_URL --body "$OPENCLAW_BASE_URL"
[ -n "${OPENCLAW_HOOK_TOKEN:-}" ] && gh secret set OPENCLAW_HOOK_TOKEN --body "$OPENCLAW_HOOK_TOKEN"
[ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ] && gh secret set OPENCLAW_GATEWAY_TOKEN --body "$OPENCLAW_GATEWAY_TOKEN"
[ -n "${GOOGLE_CLIENT_ID:-}" ] && gh secret set GOOGLE_CLIENT_ID --body "$GOOGLE_CLIENT_ID"
[ -n "${GOOGLE_CLIENT_SECRET:-}" ] && gh secret set GOOGLE_CLIENT_SECRET --body "$GOOGLE_CLIENT_SECRET"
[ -n "${GOOGLE_REDIRECT_URI:-}" ] && gh secret set GOOGLE_REDIRECT_URI --body "$GOOGLE_REDIRECT_URI"
[ -n "${MICROSOFT_CLIENT_ID:-}" ] && gh secret set MICROSOFT_CLIENT_ID --body "$MICROSOFT_CLIENT_ID"
[ -n "${MICROSOFT_CLIENT_SECRET:-}" ] && gh secret set MICROSOFT_CLIENT_SECRET --body "$MICROSOFT_CLIENT_SECRET"
[ -n "${MICROSOFT_TENANT_ID:-}" ] && gh secret set MICROSOFT_TENANT_ID --body "$MICROSOFT_TENANT_ID"
[ -n "${MICROSOFT_REDIRECT_URI:-}" ] && gh secret set MICROSOFT_REDIRECT_URI --body "$MICROSOFT_REDIRECT_URI"
[ -n "${TAILSCALE_AUTH_KEY:-}" ] && gh secret set TAILSCALE_AUTH_KEY --body "$TAILSCALE_AUTH_KEY"
[ -n "${ELITEMINI_SSH_KEY:-}" ] && gh secret set ELITEMINI_SSH_KEY --body "$ELITEMINI_SSH_KEY"
[ -n "${WHATSAPP_WEBHOOK_VERIFY_TOKEN:-}" ] && gh secret set WHATSAPP_WEBHOOK_VERIFY_TOKEN --body "$WHATSAPP_WEBHOOK_VERIFY_TOKEN"
[ -n "${WHATSAPP_PHONE_NUMBER_ID:-}" ] && gh secret set WHATSAPP_PHONE_NUMBER_ID --body "$WHATSAPP_PHONE_NUMBER_ID"
[ -n "${WHATSAPP_API_TOKEN:-}" ] && gh secret set WHATSAPP_API_TOKEN --body "$WHATSAPP_API_TOKEN"
[ -n "${WHATSAPP_OWNER_USER_ID:-}" ] && gh secret set WHATSAPP_OWNER_USER_ID --body "$WHATSAPP_OWNER_USER_ID"
[ -n "${WHATSAPP_BUSINESS_ACCOUNT_ID:-}" ] && gh secret set WHATSAPP_BUSINESS_ACCOUNT_ID --body "$WHATSAPP_BUSINESS_ACCOUNT_ID"

echo ""
echo "→ Subiendo Variables..."
gh variable set NEXT_PUBLIC_APP_URL --body "$NEXT_PUBLIC_APP_URL"

ok "Secrets y Variables del stack actual configurados"
