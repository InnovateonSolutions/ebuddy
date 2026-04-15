#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dr-restore.sh — Script de Disaster Recovery para ebuddy
#
# Uso:
#   bash scripts/dr-restore.sh <comando> [opciones]
#
# Comandos:
#   status              Verifica estado completo de la infraestructura
#   droplet             Recrea el Droplet desde Terraform
#   db-check            Verifica estado de la DB y sus backups
#   unlock-state        Libera un lock de Terraform bloqueado
#   rollback-image TAG  Rollback de la imagen Docker a un tag anterior
#   full-restore        Restauración completa desde cero
#   help                Muestra esta ayuda
#
# Prerrequisitos:
#   - doctl configurado con DO_TOKEN
#   - terraform instalado y en PATH
#   - go instalado (para infra-verify)
#   - Variables: DO_TOKEN, APP_NAME, ENVIRONMENT, TF_DIR
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
APP_NAME="${APP_NAME:-ebuddy}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
TF_DIR="${TF_DIR:-infra/terraform}"
NAME_PREFIX="${APP_NAME}-${ENVIRONMENT}"
REGISTRY="${APP_NAME}-${ENVIRONMENT}"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPTS_DIR}/.." && pwd)"

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_step()  { echo -e "\n${GREEN}=== $* ===${NC}"; }

require_env() {
  local var="$1"
  if [ -z "${!var:-}" ]; then
    log_error "Variable de entorno requerida no configurada: $var"
    exit 2
  fi
}

confirm() {
  local msg="$1"
  echo -e "${YELLOW}⚠️  $msg${NC}"
  read -r -p "¿Continuar? [y/N] " response
  [[ "$response" =~ ^[Yy]$ ]] || { log_info "Cancelado."; exit 0; }
}

# ── Comandos ──────────────────────────────────────────────────────────────────

cmd_status() {
  log_step "Estado de la infraestructura"
  require_env DO_TOKEN

  # Compilar y correr infra-verify
  if command -v go &>/dev/null; then
    log_info "Compilando infra-verify..."
    (cd "${SCRIPTS_DIR}" && go build -o /tmp/infra-verify ./infra-verify/)
    DO_TOKEN="${DO_TOKEN}" \
    APP_NAME="${APP_NAME}" \
    ENVIRONMENT="${ENVIRONMENT}" \
      /tmp/infra-verify
  else
    log_warn "go no disponible — usando curl para checks básicos"
    cmd_status_fallback
  fi
}

cmd_status_fallback() {
  # Fallback con curl si go no está disponible
  local droplet_name="${NAME_PREFIX}-droplet"
  log_info "Verificando Droplet: $droplet_name"
  STATUS=$(curl -sf \
    "https://api.digitalocean.com/v2/droplets?name=${droplet_name}" \
    -H "Authorization: Bearer ${DO_TOKEN}" \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
droplets = data.get('droplets', [])
if not droplets:
    print('FAIL: droplet not found')
    sys.exit(1)
print(f\"PASS: droplet status={droplets[0]['status']}\")
")
  echo "$STATUS"
}

cmd_droplet() {
  log_step "Recreando Droplet via Terraform"
  require_env DO_TOKEN

  confirm "Se va a recrear el Droplet '${NAME_PREFIX}-droplet'. Habrá downtime de ~5 minutos."

  cd "${REPO_ROOT}/${TF_DIR}"

  log_info "Importando estado actual de DO..."
  terraform init -reconfigure

  log_info "Planificando cambios..."
  terraform plan -target=digitalocean_droplet.app

  confirm "¿Aplicar los cambios de Terraform?"
  terraform apply -target=digitalocean_droplet.app -auto-approve

  log_info "Esperando que el Droplet esté activo (60s)..."
  sleep 60

  log_info "Verificando estado post-recreación..."
  cmd_status
}

cmd_db_check() {
  log_step "Verificando estado de la Base de Datos"
  require_env DO_TOKEN

  log_info "Consultando clusters de PostgreSQL en DO..."
  python3 - <<'PYEOF'
import urllib.request
import json
import os
import sys

token = os.environ.get("DO_TOKEN", "")
app   = os.environ.get("APP_NAME", "ebuddy")
env   = os.environ.get("ENVIRONMENT", "prod")
target_name = f"{app}-{env}-db"

req = urllib.request.Request(
    "https://api.digitalocean.com/v2/databases",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(req, timeout=15) as resp:
    data = json.load(resp)

found = False
for db in data.get("databases", []):
    if db["name"] == target_name:
        found = True
        print(f"Cluster:  {db['name']}")
        print(f"Estado:   {db['status']}")
        print(f"Engine:   {db['engine']} {db.get('version', '')}")
        print(f"Host:     {db['connection']['host']}:{db['connection']['port']}")
        if db["status"] != "online":
            print(f"\n⚠️  ATENCIÓN: Estado no es 'online'. Ver DO Console para detalles.")
            sys.exit(1)
        else:
            print("\n✓ DB online y accesible")

if not found:
    print(f"ERROR: cluster '{target_name}' no encontrado")
    sys.exit(1)
PYEOF

  log_info "Verificando conectividad TCP/TLS..."
  if command -v go &>/dev/null; then
    (cd "${SCRIPTS_DIR}" && go build -o /tmp/check-db ./check-db/)
    /tmp/check-db
  else
    log_warn "go no disponible — skipping TLS check"
  fi
}

cmd_unlock_state() {
  log_step "Liberando lock de Terraform"
  require_env DO_TOKEN

  cd "${REPO_ROOT}/${TF_DIR}"
  terraform init -reconfigure

  log_info "Obteniendo ID del lock activo..."
  # terraform force-unlock requiere el lock ID — mostramos el state para encontrarlo
  log_warn "Si terraform plan cuelga, busca el lock ID en el error y corre:"
  log_warn "  cd ${TF_DIR} && terraform force-unlock <LOCK_ID>"

  log_info "Intentando terraform plan con -lock=false para verificar el estado..."
  terraform plan -lock=false -no-color 2>&1 | head -30

  echo ""
  read -r -p "Ingresa el Lock ID para liberar (o Enter para cancelar): " lock_id
  if [ -z "$lock_id" ]; then
    log_info "Cancelado — no se liberó ningún lock."
    exit 0
  fi

  confirm "¿Liberar lock ID: $lock_id?"
  terraform force-unlock -force "$lock_id"
  log_info "✓ Lock liberado"
}

cmd_rollback_image() {
  local tag="${1:-}"
  if [ -z "$tag" ]; then
    log_error "Uso: $0 rollback-image <TAG>"
    log_info  "Tags disponibles:"
    doctl registry repository list-tags "${REGISTRY}/${APP_NAME}" \
      --format Tag --no-header | head -20
    exit 1
  fi

  log_step "Rollback de imagen Docker a tag: $tag"
  require_env DO_TOKEN

  # Obtener IP del Droplet
  log_info "Obteniendo IP del Droplet..."
  DROPLET_IP=$(python3 "${SCRIPTS_DIR}/get-droplet-ip.py")

  confirm "Se va a hacer rollback de la imagen en ${DROPLET_IP} al tag '${tag}'"

  IMAGE="registry.digitalocean.com/${REGISTRY}/${APP_NAME}:${tag}"
  log_info "Imagen: $IMAGE"

  # Conectar via SSH y hacer pull + restart
  log_warn "Conectando via SSH al Droplet para ejecutar rollback..."
  log_warn "Asegúrate de tener la llave SSH configurada (~/.ssh/id_ed25519)"

  ssh -o StrictHostKeyChecking=no "root@${DROPLET_IP}" bash <<SSHEOF
set -euo pipefail
echo "→ Pulling image: ${IMAGE}"
docker pull ${IMAGE}

echo "→ Actualizando docker-compose para usar tag: ${tag}"
sed -i "s|image: .*${APP_NAME}:.*|image: ${IMAGE}|g" /opt/ebuddy/docker-compose.prod.yml

echo "→ Recreando el contenedor..."
cd /opt/ebuddy
docker compose -f docker-compose.prod.yml up -d --force-recreate app

echo "→ Esperando 30s para verificar startup..."
sleep 30

echo "→ Verificando health endpoint..."
curl -sf http://localhost:3000/api/health | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('ok'):
    print('✓ Health check OK')
else:
    print('FAIL: health check falló', file=sys.stderr)
    sys.exit(1)
"
SSHEOF

  log_info "✓ Rollback completado a tag: $tag"
}

cmd_full_restore() {
  log_step "FULL RESTORE — Restauración completa desde cero"
  require_env DO_TOKEN

  log_error "Esta operación recreará TODA la infraestructura."
  log_error "La DB de DO Managed tiene backups automáticos — úsalos si hay pérdida de datos."
  confirm "¿Confirmas la restauración completa? Esta operación es DESTRUCTIVA."

  log_step "Paso 1/4: Terraform apply completo"
  cd "${REPO_ROOT}/${TF_DIR}"
  terraform init -reconfigure
  terraform apply -auto-approve

  log_step "Paso 2/4: Verificar infraestructura"
  cmd_status

  log_step "Paso 3/4: Inicializar DB"
  log_info "Renderizando schema SQL..."
  pip install jinja2 --quiet --break-system-packages 2>/dev/null || true
  python3 "${SCRIPTS_DIR}/db-init.py" --output /tmp/init.sql --environment "${ENVIRONMENT}"

  log_warn "Para aplicar el schema necesitas DATABASE_URL."
  log_warn "  psql \"\$DATABASE_URL\" -f /tmp/init.sql"

  log_step "Paso 4/4: Re-deploy de la app"
  log_info "Disparar el workflow de deploy en GitHub Actions:"
  log_info "  gh workflow run deploy.yml"

  log_info "✓ Full restore completado — verifica el smoke test"
}

cmd_help() {
  echo "Uso: $0 <comando> [opciones]"
  echo ""
  echo "Comandos:"
  echo "  status              Verifica estado completo de la infraestructura"
  echo "  droplet             Recrea el Droplet desde Terraform"
  echo "  db-check            Verifica estado de la DB"
  echo "  unlock-state        Libera un lock de Terraform bloqueado"
  echo "  rollback-image TAG  Rollback de la imagen Docker a un tag anterior"
  echo "  full-restore        Restauración completa desde cero"
  echo "  help                Muestra esta ayuda"
  echo ""
  echo "Variables de entorno requeridas:"
  echo "  DO_TOKEN        Token de API de DigitalOcean"
  echo "  APP_NAME        Nombre de la app (default: ebuddy)"
  echo "  ENVIRONMENT     Entorno (default: prod)"
}

# ── Router ────────────────────────────────────────────────────────────────────
CMD="${1:-help}"
shift || true

case "$CMD" in
  status)         cmd_status ;;
  droplet)        cmd_droplet ;;
  db-check)       cmd_db_check ;;
  unlock-state)   cmd_unlock_state ;;
  rollback-image) cmd_rollback_image "${1:-}" ;;
  full-restore)   cmd_full_restore ;;
  help|--help|-h) cmd_help ;;
  *)
    log_error "Comando desconocido: $CMD"
    cmd_help
    exit 1
    ;;
esac
