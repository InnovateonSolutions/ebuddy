#!/usr/bin/env bash
# Despliega la app al Droplet manualmente (sin GitHub Actions).
# Uso: ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/.env" ]; then
  echo "ERROR: No existe .env — copia .env.example a .env y llena los valores"
  exit 1
fi

set -a; source "$ROOT/.env"; set +a
set -a; source "$ROOT/infra/config/main.env"; set +a

# Obtener IP del Droplet desde Terraform
export AWS_ACCESS_KEY_ID="$DO_SPACES_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$DO_SPACES_SECRET_KEY"
DROPLET_IP=$(cd "$ROOT/infra/terraform" && terraform output -raw droplet_ip 2>/dev/null)

if [ -z "$DROPLET_IP" ]; then
  echo "ERROR: No se pudo obtener la IP del Droplet. ¿Corriste infra-apply.sh?"
  exit 1
fi

echo "→ Desplegando a $DROPLET_IP"

# Escribir el .env de la app en el Droplet (solo vars de la app, no infra)
ssh root@"$DROPLET_IP" "cat > /opt/ebuddy/.env << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENVEOF
chmod 600 /opt/ebuddy/.env"

# Pull imagen y reiniciar
ssh root@"$DROPLET_IP" '/usr/local/bin/ebuddy-deploy'

echo "✓ Deploy completo → https://$DOMAIN_NAME"
