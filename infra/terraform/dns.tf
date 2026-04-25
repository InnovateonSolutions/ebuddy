# ─────────────────────────────────────────────────────────────
# DNS — Route 53 (AWS)
# Crea el registro A en la hosted zone de innovateoncorp.com
# apuntando al Droplet de DigitalOcean.
# Caddy en el Droplet obtiene el certificado TLS automáticamente.
# ─────────────────────────────────────────────────────────────

# Busca la hosted zone por dominio — no hardcodear el Zone ID
data "aws_route53_zone" "main" {
  count        = var.enable_route53 ? 1 : 0
  name         = "innovateoncorp.com."
  private_zone = false
}

# Registro A: ebuddy.innovateoncorp.com → IP reservada del Droplet
resource "aws_route53_record" "app" {
  count   = var.enable_route53 ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name # ebuddy.innovateoncorp.com
  type    = "A"
  ttl     = 300
  records = [digitalocean_reserved_ip.app.ip_address]
}

resource "aws_route53_record" "gitlab" {
  count   = var.enable_route53 ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.gitlab_domain_name
  type    = "A"
  ttl     = 300
  records = [digitalocean_reserved_ip.app.ip_address]
}

resource "aws_route53_record" "gitlab_resend_dkim" {
  count   = var.enable_route53 && var.gitlab_resend_dkim_public_key != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "resend._domainkey.${var.gitlab_mail_domain_name}"
  type    = "TXT"
  ttl     = 300
  records = [var.gitlab_resend_dkim_public_key]
}

resource "aws_route53_record" "gitlab_resend_mx" {
  count   = var.enable_route53 ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "send.${var.gitlab_mail_domain_name}"
  type    = "MX"
  ttl     = 300
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "gitlab_resend_spf" {
  count   = var.enable_route53 ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "send.${var.gitlab_mail_domain_name}"
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_route53_record" "gitlab_resend_tracking" {
  count   = var.enable_route53 ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "links.${var.gitlab_mail_domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["links1.resend-dns.com"]
}
