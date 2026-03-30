# ─────────────────────────────────────────────────────────────
# Droplet — reemplaza ECS Fargate + IAM + Secrets Manager
# Ubuntu 24.04, Docker instalado via cloud-init
# Caddy como reverse proxy con HTTPS automático (Let's Encrypt)
# Secrets: .env en /opt/ebuddy/.env — escrito por GitHub Actions via SSH
# ─────────────────────────────────────────────────────────────

data "digitalocean_image" "ubuntu" {
  slug = "ubuntu-24-04-x64"
}

resource "digitalocean_droplet" "app" {
  name     = "${local.name_prefix}-droplet"
  size     = var.droplet_size
  image    = data.digitalocean_image.ubuntu.id
  region   = var.do_region
  vpc_uuid = digitalocean_vpc.main.id
  ssh_keys = [digitalocean_ssh_key.deploy.fingerprint]

  # Monitoreo integrado de DO (CPU, memoria, disco)
  monitoring = true

  user_data = templatefile("${path.module}/cloud-init.tpl", {
    registry_name  = digitalocean_container_registry.main.name
    app_name       = var.app_name
    environment    = var.environment
    domain_name    = var.domain_name
    docker_config  = digitalocean_container_registry_docker_credentials.pull.docker_credentials
  })

  lifecycle {
    # No destruir el Droplet si solo cambia el user_data (cloud-init solo corre al crear)
    ignore_changes = [user_data]
  }

  tags = [var.app_name, var.environment]
}

# Reservar IP fija para el Droplet — el dominio siempre apunta aquí aunque se recree el Droplet
resource "digitalocean_reserved_ip" "app" {
  region = var.do_region
}

resource "digitalocean_reserved_ip_assignment" "app" {
  ip_address = digitalocean_reserved_ip.app.ip_address
  droplet_id = digitalocean_droplet.app.id
}
