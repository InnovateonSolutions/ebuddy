output "droplet_ip" {
  description = "IP reservada del Droplet — agregar como DO_DROPLET_IP en GitHub Actions secrets"
  value       = digitalocean_reserved_ip.app.ip_address
}

output "droplet_id" {
  description = "ID del Droplet"
  value       = digitalocean_droplet.app.id
}

output "registry_endpoint" {
  description = "Endpoint del Container Registry — usar en docker build/push"
  value       = "registry.digitalocean.com/${digitalocean_container_registry.main.name}"
}

output "registry_push_credentials" {
  description = "Docker config JSON para GitHub Actions (push) — agregar como DO_REGISTRY_PUSH_CREDENTIALS en secrets"
  value       = digitalocean_container_registry_docker_credentials.push.docker_credentials
  sensitive   = true
}

output "dns_record" {
  description = "Registro A creado en Route 53"
  value       = var.enable_route53 ? "${aws_route53_record.app[0].name} → ${digitalocean_reserved_ip.app.ip_address}" : "DNS manual: crear un registro A para ${var.domain_name} → ${digitalocean_reserved_ip.app.ip_address}"
}

output "ssh_connect" {
  description = "Comando para conectarse al Droplet"
  value       = "ssh root@${digitalocean_reserved_ip.app.ip_address}"
}

output "app_url" {
  description = "URL de la app en producción"
  value       = "https://${var.domain_name}"
}

# ─── Database outputs ────────────────────────────────────────
output "db_host" {
  description = "Host del DO Managed PostgreSQL"
  value       = digitalocean_database_cluster.postgres.host
}

output "db_port" {
  description = "Puerto del DO Managed PostgreSQL"
  value       = digitalocean_database_cluster.postgres.port
}

output "db_name" {
  description = "Nombre de la base de datos de la app"
  value       = digitalocean_database_db.app.name
}

output "db_user" {
  description = "Usuario de la app en PostgreSQL"
  value       = digitalocean_database_user.app.name
}

output "db_uri" {
  description = "Connection string completo — agregar como DATABASE_URL en GitHub Secrets"
  value       = "postgresql://${digitalocean_database_user.app.name}:${digitalocean_database_user.app.password}@${digitalocean_database_cluster.postgres.host}:${digitalocean_database_cluster.postgres.port}/${digitalocean_database_db.app.name}?sslmode=require"
  sensitive   = true
}
