# Runbook — ebuddy

> Procedimientos operativos para el entorno prod/MVP en DigitalOcean Droplet.

---

## Deploy desde cero (primera vez)

```bash
# Pre-requisitos:
#   - doctl instalado: brew install doctl
#   - Terraform >= 1.7 instalado
#   - Docker instalado localmente
#   - Dominio con nameservers apuntando a DO (ns1/ns2/ns3.digitalocean.com)

# 1. Crear DO Spaces para el Terraform state
doctl compute spaces create ebuddy-tfstate --region nyc3

# 2. Inicializar Terraform
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars con los valores reales

export AWS_ACCESS_KEY_ID=<spaces_access_key>
export AWS_SECRET_ACCESS_KEY=<spaces_secret_key>
terraform init

# 3. Revisar y aplicar
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"

# 4. Guardar outputs en GitHub Actions secrets
terraform output droplet_ip
# → agregar como DO_DROPLET_IP en GitHub Actions secrets

terraform output -json registry_push_credentials
# → agregar como DO_REGISTRY_PUSH_CREDENTIALS en GitHub Actions secrets

# 5. Agregar todos los secrets de la app en GitHub Actions
# Ver docs/infrastructure/secrets.md — sección "Carga inicial"

# 6. Correr las migraciones de Supabase
# Pegar el contenido de supabase/migrations/001_initial_schema.sql
# y 002_rls_policies.sql en el Supabase SQL Editor

# 7. Hacer el primer deploy
# Push a main → GitHub Actions hace build + push a DOCR + deploy al Droplet
git push origin main

# 8. Verificar que la app está corriendo
curl https://<domain>/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Deploy de nueva versión (CI/CD automático)

Push a `main` → GitHub Actions hace:
1. Build de la imagen Docker con los `NEXT_PUBLIC_*` build args.
2. Push a DOCR con tags `sha-<commit>` y `latest`.
3. SSH al Droplet → escribe `/opt/ebuddy/.env` → corre `ebuddy-deploy`.

El script `ebuddy-deploy` en el Droplet:
```bash
cd /opt/ebuddy
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
docker image prune -f
```

### Deploy manual sin CI/CD

```bash
# Desde local — build y push a DOCR
doctl auth init  # una vez
doctl registry login --expiry-seconds 1200

docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=<url> \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<key> \
  --build-arg NEXT_PUBLIC_APP_URL=https://<domain> \
  -t registry.digitalocean.com/ebuddy-prod/ebuddy:latest \
  -t registry.digitalocean.com/ebuddy-prod/ebuddy:sha-$(git rev-parse --short HEAD) \
  .

docker push registry.digitalocean.com/ebuddy-prod/ebuddy:latest
docker push registry.digitalocean.com/ebuddy-prod/ebuddy:sha-$(git rev-parse --short HEAD)

# Deploy en el Droplet
ssh root@<droplet_ip> ebuddy-deploy
```

---

## Monitoreo básico

### Ver estado de los containers

```bash
# SSH al Droplet
ssh root@<droplet_ip>

# Estado general
docker compose -f /opt/ebuddy/docker-compose.prod.yml ps

# Health check manual
curl http://localhost:3000/api/health
```

### Ver logs en tiempo real

```bash
# Todos los containers
ssh root@<droplet_ip> "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs -f"

# Solo la app
ssh root@<droplet_ip> "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs -f app"

# Últimas 100 líneas
ssh root@<droplet_ip> "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs --tail=100 app"

# Filtrar errores
ssh root@<droplet_ip> "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs app" | grep ERROR
```

---

## Troubleshooting

### La app no responde

```bash
ssh root@<droplet_ip>

# 1. Ver estado de containers
docker compose -f /opt/ebuddy/docker-compose.prod.yml ps

# 2. Si el container app está Down o Restarting
docker compose -f /opt/ebuddy/docker-compose.prod.yml logs --tail=50 app
# Causas comunes:
#   - "Missing env var: ..." → el .env no tiene todas las variables
#   - Puerto ya en uso → revisar con: ss -tlnp | grep 3000
#   - OOM (Out of Memory) → revisar con: dmesg | grep -i oom

# 3. Reiniciar manualmente
docker compose -f /opt/ebuddy/docker-compose.prod.yml up -d
```

### Caddy no sirve HTTPS

```bash
ssh root@<droplet_ip>

# Ver logs de Caddy
docker compose -f /opt/ebuddy/docker-compose.prod.yml logs caddy

# Causas comunes:
#   - "challenge failed" → DNS no apunta aún al Droplet (esperar propagación)
#   - "connection refused" → la app no está corriendo (Caddy espera a que app esté healthy)
#   - Puerto 80 bloqueado → verificar firewall DO en el dashboard

# Forzar renovación de certificado
docker compose -f /opt/ebuddy/docker-compose.prod.yml restart caddy
```

### Respuestas lentas / timeout en IA

```bash
# Ver requests lentos en logs estructurados
ssh root@<droplet_ip> \
  "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs app" | \
  python3 -c "import sys,json; [print(l) for l in sys.stdin if 'durationMs' in l and json.loads(l).get('durationMs',0) > 5000]"

# Causas comunes:
# - Whisper o Claude con alta latencia → revisar dashboards de OpenAI/Anthropic
# - Cold start del container → normal si el Droplet acaba de reiniciarse
# - Audio muy largo (>60s) → validar que el cliente limita la duración
```

### Rollback a imagen anterior

```bash
ssh root@<droplet_ip>

# Ver imágenes disponibles
docker images registry.digitalocean.com/ebuddy-prod/ebuddy

# Correr imagen específica
IMAGE=registry.digitalocean.com/ebuddy-prod/ebuddy:sha-<commit>
docker compose -f /opt/ebuddy/docker-compose.prod.yml \
  run -e "IMAGE=$IMAGE" app
# O editar docker-compose.prod.yml temporalmente cambiando el tag de :latest a :sha-<commit>
# y luego: docker compose up -d app
```

---

## Gestión de costos

El costo es fijo (~$16/mes) — no hay componentes de pago por uso en la infra de DO.

Los únicos costos variables son las APIs de IA (OpenAI + Anthropic). Monitorear en sus dashboards.

### Apagar el Droplet (ahorro total)

```bash
# Apagar — deja de cobrar el cómputo pero mantiene la IP reservada ($4/mes)
doctl compute droplet-action power-off <droplet_id>

# Para volver a activar
doctl compute droplet-action power-on <droplet_id>
```

---

## Destruir todo el entorno

```bash
cd infra/terraform

# ADVERTENCIA: elimina el Droplet, registry, VPC, DNS records, etc.
# Los datos en Supabase Cloud NO se eliminan (están fuera de Terraform)
terraform destroy -var-file="terraform.tfvars"

# También eliminar el Space de Terraform state si ya no se necesita
doctl compute spaces delete ebuddy-tfstate
```
