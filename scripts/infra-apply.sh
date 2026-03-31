#!/usr/bin/env bash
# Levanta la infraestructura en DigitalOcean con Terraform.
# Uso: ./scripts/infra-apply.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/.env" ]; then
  echo "ERROR: No existe .env — copia .env.example a .env y llena los valores"
  exit 1
fi

set -a; source "$ROOT/.env"; set +a

# Credenciales del backend S3-compatible (DO Spaces)
export AWS_ACCESS_KEY_ID="$DO_SPACES_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$DO_SPACES_SECRET_KEY"

# Variables de Terraform — leídas del .env
export TF_VAR_do_token="$DO_TOKEN"

# El resto viene de infra/config/main.env (commiteado, no sensible)
set -a; source "$ROOT/infra/config/main.env"; set +a
export TF_VAR_do_region="$DO_REGION"
export TF_VAR_app_name="$APP_NAME"
export TF_VAR_environment="$ENVIRONMENT"
export TF_VAR_domain_name="$DOMAIN_NAME"
export TF_VAR_droplet_size="$DROPLET_SIZE"
export TF_VAR_alert_email="$ALERT_EMAIL"
export TF_VAR_ssh_pub_key="$(cat ~/.ssh/id_ed25519.pub)"

cd "$ROOT/infra/terraform"

echo "→ terraform init"
terraform init

echo "→ terraform plan"
terraform plan

echo ""
read -rp "¿Aplicar? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelado."
  exit 0
fi

echo "→ terraform apply"
terraform apply -auto-approve

echo ""
echo "✓ Infraestructura lista"
echo "  IP del Droplet : $(terraform output -raw droplet_ip)"
echo "  Registry       : $(terraform output -raw registry_endpoint)"
echo ""
echo "Próximo paso: agrega un registro A en Route 53:"
echo "  $DOMAIN_NAME → $(terraform output -raw droplet_ip)"
