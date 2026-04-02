#!/usr/bin/env bash
# setup-secrets.sh — Configura todos los GitHub Secrets y Variables
#
# Única herramienta necesaria: gh (GitHub CLI) — ya instalado.
# No requiere doctl, terraform ni supabase localmente.
#
# Uso:
#   cp .bootstrap.env.example .bootstrap.env
#   # Editar .bootstrap.env con tus credenciales
#   ./scripts/setup-secrets.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP_ENV="$ROOT/.bootstrap.env"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✓${NC}  $*"; }
err() { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── Verificaciones ────────────────────────────────────────────
[ -f "$BOOTSTRAP_ENV" ] || err "No existe .bootstrap.env — cópialo desde .bootstrap.env.example"
command -v gh &>/dev/null  || err "gh no encontrado"
gh auth status &>/dev/null || err "gh no autenticado — corre: gh auth login"

set -a; source "$BOOTSTRAP_ENV"; set +a

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) \
  || err "No estás dentro de un repo de GitHub. Corre desde /home/mct/opt/personal/IA-Secretary"

echo "→ Configurando $REPO"

# ── SSH key ───────────────────────────────────────────────────
SSH_KEY="$HOME/.ssh/ebuddy-deploy"
if [ ! -f "$SSH_KEY" ]; then
  ssh-keygen -t ed25519 -C "ebuddy-deploy" -f "$SSH_KEY" -N ""
  ok "SSH key generada en $SSH_KEY"
else
  ok "SSH key ya existe en $SSH_KEY"
fi

# ── GitHub Secrets ────────────────────────────────────────────
echo ""
echo "→ Subiendo Secrets..."

gh secret set DO_TOKEN                  --body "$DO_TOKEN"
gh secret set DO_SPACES_ACCESS_KEY      --body "$DO_SPACES_ACCESS_KEY"
gh secret set DO_SPACES_SECRET_KEY      --body "$DO_SPACES_SECRET_KEY"
gh secret set DO_SSH_PRIVATE_KEY        --body "$(cat "$SSH_KEY")"
gh secret set SUPABASE_ACCESS_TOKEN     --body "$SUPABASE_ACCESS_TOKEN"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"
gh secret set SUPABASE_DB_PASSWORD      --body "$SUPABASE_DB_PASSWORD"
gh secret set ANTHROPIC_API_KEY         --body "$ANTHROPIC_API_KEY"
gh secret set OPENAI_API_KEY            --body "$OPENAI_API_KEY"

ok "9 Secrets configurados"

# ── GitHub Variables ──────────────────────────────────────────
echo ""
echo "→ Subiendo Variables..."

gh variable set DO_SSH_PUB_KEY                --body "$(cat "${SSH_KEY}.pub")"
gh variable set NEXT_PUBLIC_SUPABASE_ANON_KEY  --body "$NEXT_PUBLIC_SUPABASE_ANON_KEY"

ok "Variables DO_SSH_PUB_KEY y NEXT_PUBLIC_SUPABASE_ANON_KEY configuradas"

# ── Resumen ───────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Secrets y Variables listos en $REPO"
echo ""
echo " Siguiente paso:"
echo " GitHub → Actions → Terraform — Infrastructure"
echo " → Run workflow → action: apply"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
