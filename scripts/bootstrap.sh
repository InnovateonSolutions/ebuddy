#!/usr/bin/env bash
# bootstrap.sh — Setup completo desde cero
#
# Qué hace:
#   1. Verifica herramientas necesarias
#   2. Genera SSH key para el Droplet (si no existe)
#   3. Configura todos los GitHub Secrets y Variables
#   4. Crea el DO Space para estado de Terraform
#   5. Corre Terraform (provisiona Droplet + DOCR)
#   6. Actualiza GitHub Variables con outputs de Terraform
#   7. Aplica migraciones de Supabase
#   8. Dispara el primer deploy
#
# Uso:
#   cp .bootstrap.env.example .bootstrap.env
#   # Editar .bootstrap.env con tus credenciales
#   ./scripts/bootstrap.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP_ENV="$ROOT/.bootstrap.env"
MAIN_ENV="$ROOT/infra/config/main.env"
SSH_KEY_PATH="$HOME/.ssh/ebuddy-deploy"
SUPABASE_PROJECT_REF="nncikrxfpchwaqeuvrll"

# ── Colores ──────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}→${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }
success() { echo -e "${GREEN}✓${NC}  $*"; }

# ── 0. Verificar .bootstrap.env ──────────────────────────────
if [ ! -f "$BOOTSTRAP_ENV" ]; then
  error "No existe .bootstrap.env — cópialo desde .bootstrap.env.example y completa los valores"
fi

set -a; source "$BOOTSTRAP_ENV"; set +a
set -a; source "$MAIN_ENV"; set +a

# ── 1. Verificar herramientas ─────────────────────────────────
info "Verificando herramientas..."

missing=()
for tool in gh doctl terraform supabase; do
  if ! command -v "$tool" &>/dev/null; then
    missing+=("$tool")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo ""
  warn "Herramientas faltantes: ${missing[*]}"
  echo ""
  echo "  gh:        https://cli.github.com"
  echo "  doctl:     https://docs.digitalocean.com/reference/doctl/how-to/install"
  echo "  terraform: https://developer.hashicorp.com/terraform/install"
  echo "  supabase:  npm install -g supabase"
  echo ""
  error "Instala las herramientas faltantes y vuelve a correr el script"
fi

# Verificar que gh está autenticado
if ! gh auth status &>/dev/null; then
  error "GitHub CLI no autenticado — corre: gh auth login"
fi

# Verificar que doctl está autenticado
if ! doctl account get &>/dev/null; then
  info "Autenticando doctl..."
  doctl auth init --access-token "$DO_TOKEN"
fi

success "Herramientas OK"

# ── 2. SSH Key ────────────────────────────────────────────────
info "Configurando SSH key..."

if [ ! -f "$SSH_KEY_PATH" ]; then
  ssh-keygen -t ed25519 -C "ebuddy-deploy" -f "$SSH_KEY_PATH" -N ""
  success "SSH key generada en $SSH_KEY_PATH"
else
  success "SSH key ya existe en $SSH_KEY_PATH"
fi

SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")
SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")

# ── 3. DO Space para estado de Terraform ─────────────────────
info "Verificando DO Space para estado de Terraform..."

SPACE_NAME="ebuddy-tfstate"
if ! doctl spaces list --access-key "$DO_SPACES_ACCESS_KEY" --secret-key "$DO_SPACES_SECRET_KEY" 2>/dev/null | grep -q "$SPACE_NAME"; then
  doctl spaces create "$SPACE_NAME" \
    --region "$DO_REGION" \
    --access-key "$DO_SPACES_ACCESS_KEY" \
    --secret-key "$DO_SPACES_SECRET_KEY"
  success "Space '$SPACE_NAME' creado"
else
  success "Space '$SPACE_NAME' ya existe"
fi

# ── 4. Obtener anon key de Supabase via API ───────────────────
info "Obteniendo Supabase anon key..."

ANON_KEY_RESPONSE=$(curl -sf \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/api-keys" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")

NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo "$ANON_KEY_RESPONSE" \
  | grep -o '"anon","key":"[^"]*"' \
  | grep -o '"key":"[^"]*"' \
  | cut -d'"' -f4)

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  error "No se pudo obtener el anon key de Supabase. Verifica SUPABASE_ACCESS_TOKEN en .bootstrap.env"
fi

success "Supabase anon key obtenida"

# Actualizar main.env con el valor real
sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}|" "$MAIN_ENV"
success "main.env actualizado con anon key"

# ── 5. GitHub Secrets ─────────────────────────────────────────
info "Configurando GitHub Secrets..."

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

gh secret set DO_TOKEN                 --body "$DO_TOKEN"
gh secret set DO_SPACES_ACCESS_KEY     --body "$DO_SPACES_ACCESS_KEY"
gh secret set DO_SPACES_SECRET_KEY     --body "$DO_SPACES_SECRET_KEY"
gh secret set DO_SSH_PRIVATE_KEY       --body "$SSH_PRIVATE_KEY"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"
gh secret set SUPABASE_ACCESS_TOKEN    --body "$SUPABASE_ACCESS_TOKEN"
gh secret set SUPABASE_DB_PASSWORD     --body "$SUPABASE_DB_PASSWORD"
gh secret set ANTHROPIC_API_KEY        --body "$ANTHROPIC_API_KEY"
gh secret set OPENAI_API_KEY           --body "$OPENAI_API_KEY"

success "GitHub Secrets configurados en $REPO"

# ── 6. GitHub Variables (conocidas antes de Terraform) ───────
info "Configurando GitHub Variables..."

gh variable set DO_SSH_PUB_KEY              --body "$SSH_PUB_KEY"
gh variable set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "$NEXT_PUBLIC_SUPABASE_ANON_KEY"

success "GitHub Variables base configuradas"

# ── 7. Terraform ──────────────────────────────────────────────
info "Inicializando Terraform..."

export AWS_ACCESS_KEY_ID="$DO_SPACES_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$DO_SPACES_SECRET_KEY"
export TF_VAR_do_token="$DO_TOKEN"
export TF_VAR_ssh_pub_key="$SSH_PUB_KEY"
export TF_VAR_do_region="$DO_REGION"
export TF_VAR_app_name="$APP_NAME"
export TF_VAR_environment="$ENVIRONMENT"
export TF_VAR_domain_name="$DOMAIN_NAME"
export TF_VAR_droplet_size="$DROPLET_SIZE"
export TF_VAR_alert_email="$ALERT_EMAIL"

cd "$ROOT/infra/terraform"
terraform init
terraform apply -auto-approve -no-color

# ── 8. GitHub Variables desde outputs de Terraform ───────────
info "Actualizando GitHub Variables con outputs de Terraform..."

DROPLET_IP=$(terraform output -raw droplet_ip)
REGISTRY_ENDPOINT=$(terraform output -raw registry_endpoint)
REGISTRY_NAME="${REGISTRY_ENDPOINT#registry.digitalocean.com/}"

gh variable set DO_DROPLET_IP    --body "$DROPLET_IP"
gh variable set DO_REGISTRY_NAME --body "$REGISTRY_NAME"

success "DO_DROPLET_IP=$DROPLET_IP"
success "DO_REGISTRY_NAME=$REGISTRY_NAME"

cd "$ROOT"

# ── 9. Migraciones de Supabase ────────────────────────────────
info "Aplicando migraciones de Supabase..."

supabase db push \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --password "$SUPABASE_DB_PASSWORD"

success "Migraciones aplicadas"

# ── 10. Primer deploy ─────────────────────────────────────────
info "Disparando primer deploy..."

# Commit del anon key actualizado en main.env
cd "$ROOT"
git add infra/config/main.env
git diff --staged --quiet || git commit -m "chore: set supabase anon key in main.env"
git push

success "Push a main — el workflow de deploy se dispara automáticamente"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Setup completo"
echo " App:    https://$DOMAIN_NAME"
echo " Droplet: ssh root@$DROPLET_IP"
echo " Logs:   gh run watch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
