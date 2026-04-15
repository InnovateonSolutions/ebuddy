# ─────────────────────────────────────────────────────────────
# DNS — Route 53 (AWS)
# Crea el registro A en la hosted zone de innovateoncorp.com
# apuntando al Droplet de DigitalOcean.
# Caddy en el Droplet obtiene el certificado TLS automáticamente.
# ─────────────────────────────────────────────────────────────

# Busca la hosted zone por dominio — no hardcodear el Zone ID
data "aws_route53_zone" "main" {
  name         = "innovateoncorp.com."
  private_zone = false
}

# Registro A: ebuddy.innovateoncorp.com → IP reservada del Droplet
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name  # ebuddy.innovateoncorp.com
  type    = "A"
  ttl     = 300
  records = [digitalocean_reserved_ip.app.ip_address]
}
