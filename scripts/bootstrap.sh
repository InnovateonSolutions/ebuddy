#!/usr/bin/env bash
# bootstrap.sh — Setup inicial del stack actual en DigitalOcean.
#
# Qué hace:
#   1. Verifica herramientas y credenciales base
#   2. Configura GitHub Secrets/Variables con el stack actual
#   3. Inicializa/aplica Terraform
#   4. Muestra los siguientes pasos operativos
#
# Uso:
#   cp .bootstrap.env.example .bootstrap.env
#   # Editar .bootstrap.env con credenciales y secrets reales
#   ./scripts/bootstrap.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP_ENV="$ROOT/.bootstrap.env"
MAIN_ENV="$ROOT/infra/config/main.env"
SSH_KEY_PATH="$HOME/.ssh/ebuddy-deploy"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}→${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }
success() { echo -e "${GREEN}✓${NC}  $*"; }

[ -f "$BOOTSTRAP_ENV" ] || error "No existe .bootstrap.env — cópialo desde .bootstrap.env.example"
[ -f "$MAIN_ENV" ] || error "No existe infra/config/main.env"

set -a
source "$BOOTSTRAP_ENV"
source "$MAIN_ENV"
set +a

info "Verificando herramientas..."
missing=()
for tool in gh doctl terraform; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    missing+=("$tool")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  warn "Herramientas faltantes: ${missing[*]}"
  error "Instala las herramientas faltantes y vuelve a correr el script"
fi

gh auth status >/dev/null 2>&1 || error "GitHub CLI no autenticado — corre: gh auth login"

if ! doctl account get >/dev/null 2>&1; then
  info "Autenticando doctl..."
  doctl auth init --access-token "$DO_TOKEN"
fi

success "Herramientas OK"

info "Configurando SSH key..."
if [ ! -f "$SSH_KEY_PATH" ]; then
  ssh-keygen -t ed25519 -C "ebuddy-deploy" -f "$SSH_KEY_PATH" -N ""
  success "SSH key generada en $SSH_KEY_PATH"
else
  success "SSH key ya existe en $SSH_KEY_PATH"
fi

info "Configurando GitHub Secrets y Variables..."
"$ROOT/scripts/setup-secrets.sh"
success "Secrets y Variables subidos"

info "Aplicando Terraform..."
export AWS_ACCESS_KEY_ID="$DO_SPACES_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$DO_SPACES_SECRET_KEY"
export TF_VAR_do_token="$DO_TOKEN"
export TF_VAR_ssh_pub_key="$(cat "${SSH_KEY_PATH}.pub")"
export TF_VAR_do_region="$DO_REGION"
export TF_VAR_app_name="$APP_NAME"
export TF_VAR_environment="$ENVIRONMENT"
export TF_VAR_domain_name="$DOMAIN_NAME"
export TF_VAR_droplet_size="$DROPLET_SIZE"
export TF_VAR_alert_email="$ALERT_EMAIL"

cd "$ROOT/infra/terraform"
terraform init
terraform apply -auto-approve -no-color

DROPLET_IP="$(terraform output -raw droplet_ip)"
REGISTRY_ENDPOINT="$(terraform output -raw registry_endpoint)"

success "Infraestructura aplicada"
success "Droplet IP: $DROPLET_IP"
success "Registry: $REGISTRY_ENDPOINT"

cd "$ROOT"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Setup completo"
echo " App:     https://$DOMAIN_NAME"
echo " Droplet: ssh root@$DROPLET_IP"
echo ""
echo " Siguiente paso sugerido:"
echo " 1. Ejecutar el workflow bootstrap-deploy desde GitHub Actions"
echo " 2. O correr ./scripts/deploy.sh para un deploy manual"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
