# ─────────────────────────────────────────────────────────────
# DO Managed PostgreSQL — reemplaza Supabase como base de datos
# db-s-1vcpu-1gb = $15/mes — suficiente para MVP (1 usuario)
# Firewall: solo el Droplet puede conectarse (no acceso público)
# ─────────────────────────────────────────────────────────────

resource "digitalocean_database_cluster" "postgres" {
  name       = "${local.name_prefix}-db"
  engine     = "pg"
  version    = "16"
  size       = "db-s-1vcpu-1gb"
  region     = var.do_region
  node_count = 1

  tags = [var.app_name, var.environment]

  lifecycle {
    ignore_changes = [name, tags]
  }
}

resource "digitalocean_database_firewall" "postgres" {
  cluster_id = digitalocean_database_cluster.postgres.id

  # Solo el Droplet puede conectarse — segunda línea de defensa
  rule {
    type  = "droplet"
    value = digitalocean_droplet.app.id
  }
}

# Usuario de aplicación con permisos mínimos (no superuser)
resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "${var.app_name}_app"
}

# Base de datos dedicada para la app
resource "digitalocean_database_db" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = var.app_name
}
