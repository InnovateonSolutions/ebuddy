#!/bin/bash
# Runs on the droplet via SSH. Brings down stale containers, pulls the new
# image, and starts fresh with --force-recreate.
set -euo pipefail

COMPOSE_FILE="/opt/ebuddy/docker-compose.prod.yml"

# Bring down both the old project name (ebuddy, from cloud-init without name:)
# and the current one (ebuddy-prod) to avoid port conflicts on rename.
docker compose -p ebuddy     -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true
docker compose -p ebuddy-prod -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

docker compose -f "$COMPOSE_FILE" pull app

docker compose -f "$COMPOSE_FILE" up -d --force-recreate || {
  echo "=== APP LOGS ==="
  docker compose -f "$COMPOSE_FILE" logs app --tail=80 2>&1 || true
  echo "=== HEALTHCHECK HISTORY ==="
  docker inspect ebuddy-prod-app-1 \
    --format='{{range .State.Health.Log}}ExitCode={{.ExitCode}} Output={{.Output}}{{"\n"}}{{end}}' \
    2>&1 || true
  echo "=== ENV INSIDE CONTAINER ==="
  docker exec ebuddy-prod-app-1 env 2>&1 | grep -E "HOSTNAME|PORT|NODE_ENV" || true
  echo "=== PORT BINDING ==="
  docker exec ebuddy-prod-app-1 sh -c "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo 'no tool'" || true
  echo "=== PROCESSES ==="
  docker exec ebuddy-prod-app-1 ps aux 2>/dev/null || docker exec ebuddy-prod-app-1 ps -ef 2>/dev/null || true
  echo "=== CONTAINER STATUS ==="
  docker compose -f "$COMPOSE_FILE" ps 2>&1 || true
  exit 1
}

docker image prune -f
echo "Deploy completado: $(date)"
