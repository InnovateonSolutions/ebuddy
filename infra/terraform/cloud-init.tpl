#!/bin/bash
# cloud-init — se ejecuta UNA VEZ al crear el Droplet
# Instala Docker + Caddy y deja el servidor listo para recibir deploys

set -euo pipefail

APP_DIR="/opt/ebuddy"
mkdir -p "$APP_DIR"

# ── Docker ────────────────────────────────────────────────────

apt-get update -y
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable --now docker

# ── Autenticación DOCR para pull ─────────────────────────────

mkdir -p /root/.docker
cat > /root/.docker/config.json << 'DOCKEREOF'
${docker_config}
DOCKEREOF
chmod 600 /root/.docker/config.json

# ── docker-compose.prod.yml ───────────────────────────────────

cat > "$APP_DIR/docker-compose.prod.yml" << 'COMPOSEEOF'
services:
  app:
    image: registry.digitalocean.com/${registry_name}/${app_name}:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    env_file: /opt/ebuddy/.env
    environment:
      NODE_ENV: production
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - /opt/ebuddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
COMPOSEEOF

# ── Caddyfile ────────────────────────────────────────────────
# HTTPS automático con Let's Encrypt — sin configuración extra

cat > "$APP_DIR/Caddyfile" << 'CADDYEOF'
${domain_name} {
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        Permissions-Policy "microphone=(self)"
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        -Server
    }
    reverse_proxy app:3000
}
CADDYEOF

# ── Script de deploy ──────────────────────────────────────────
# Llamado por GitHub Actions en cada push a main

cat > /usr/local/bin/ebuddy-deploy << 'DEPLOYEOF'
#!/bin/bash
set -euo pipefail
cd /opt/ebuddy
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d
docker image prune -f
echo "Deploy completado: $(date)"
DEPLOYEOF
chmod +x /usr/local/bin/ebuddy-deploy

# ── .env placeholder ─────────────────────────────────────────
# GitHub Actions sobreescribe este archivo en cada deploy

cat > "$APP_DIR/.env" << 'ENVEOF'
# Placeholder — GitHub Actions escribe los valores reales aquí en el primer deploy
NODE_ENV=production
ENVEOF
chmod 600 "$APP_DIR/.env"

echo "cloud-init completado — servidor listo para recibir deploys"
