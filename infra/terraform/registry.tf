# ─────────────────────────────────────────────────────────────
# Container Registry (DOCR) — reemplaza ECR
# URL resultante: registry.digitalocean.com/<name>/<app>:<tag>
# ─────────────────────────────────────────────────────────────

resource "digitalocean_container_registry" "main" {
  name                   = local.name_prefix
  subscription_tier_slug = "starter" # gratis — 1 repo, 500 MB
  region                 = var.do_region
}

# Credenciales de solo-lectura para que el Droplet pueda hacer pull
# Se generan como Docker config JSON y se escriben en el Droplet via cloud-init
resource "digitalocean_container_registry_docker_credentials" "pull" {
  registry_name  = digitalocean_container_registry.main.name
  write          = false
  expiry_seconds = 0 # no expira — rotar manualmente si es necesario
}

# Credenciales de escritura para GitHub Actions (push de imágenes)
resource "digitalocean_container_registry_docker_credentials" "push" {
  registry_name  = digitalocean_container_registry.main.name
  write          = true
  expiry_seconds = 0
}
