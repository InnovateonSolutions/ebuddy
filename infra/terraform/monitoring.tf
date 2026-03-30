# ─────────────────────────────────────────────────────────────
# Monitoreo — alertas de DO (reemplaza CloudWatch)
# Requiere monitoring = true en el Droplet
# ─────────────────────────────────────────────────────────────

# ── CPU alta sostenida ────────────────────────────────────────

resource "digitalocean_monitor_alert" "cpu_high" {
  alerts {
    email = [var.alert_email]
  }
  window      = "5m"
  type        = "v1/insights/droplet/cpu"
  compare     = "GreaterThan"
  value       = 85
  enabled     = true
  entities    = [digitalocean_droplet.app.id]
  description = "${local.name_prefix}: CPU > 85% durante 5 minutos"
}

# ── Memoria alta ──────────────────────────────────────────────

resource "digitalocean_monitor_alert" "memory_high" {
  alerts {
    email = [var.alert_email]
  }
  window      = "5m"
  type        = "v1/insights/droplet/memory_utilization_percent"
  compare     = "GreaterThan"
  value       = 85
  enabled     = true
  entities    = [digitalocean_droplet.app.id]
  description = "${local.name_prefix}: Memoria > 85% durante 5 minutos"
}

# ── Disco casi lleno ──────────────────────────────────────────

resource "digitalocean_monitor_alert" "disk_high" {
  alerts {
    email = [var.alert_email]
  }
  window      = "5m"
  type        = "v1/insights/droplet/disk_utilization_percent"
  compare     = "GreaterThan"
  value       = 80
  enabled     = true
  entities    = [digitalocean_droplet.app.id]
  description = "${local.name_prefix}: Disco > 80%"
}
