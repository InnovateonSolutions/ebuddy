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

output "route53_record_instructions" {
  description = "Instrucciones para crear el registro A en Route 53 manualmente"
  value       = "En Route 53 → Hosted Zone → Crear registro A: nombre=${var.domain_name}, valor=${digitalocean_reserved_ip.app.ip_address}, TTL=300"
}

output "ssh_connect" {
  description = "Comando para conectarse al Droplet"
  value       = "ssh root@${digitalocean_reserved_ip.app.ip_address}"
}

output "app_url" {
  description = "URL de la app en producción"
  value       = "https://${var.domain_name}"
}
