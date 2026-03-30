# ─────────────────────────────────────────────────────────────
# Networking — VPC, Firewall, SSH Key, Dominio y DNS
# Reemplaza vpc.tf + alb.tf de la config AWS
# No se necesita Load Balancer en MVP — Caddy en el Droplet
# maneja HTTPS + reverse proxy directamente.
# ─────────────────────────────────────────────────────────────

# ── VPC privada ───────────────────────────────────────────────

resource "digitalocean_vpc" "main" {
  name     = "${local.name_prefix}-vpc"
  region   = var.do_region
  ip_range = "10.10.0.0/24"
}

# ── SSH Key ───────────────────────────────────────────────────

resource "digitalocean_ssh_key" "deploy" {
  name       = "${local.name_prefix}-deploy-key"
  public_key = var.ssh_pub_key
}

# ── Firewall ──────────────────────────────────────────────────
# Solo expone 80, 443 y SSH (22) desde internet.
# El puerto 3000 de la app Next.js NO se expone — solo Caddy lo accede internamente.

resource "digitalocean_firewall" "app" {
  name = "${local.name_prefix}-firewall"

  droplet_ids = [digitalocean_droplet.app.id]

  # ── Inbound ───────────────────────────────────────────────

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "udp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"] # HTTP/3 (QUIC)
  }

  # ── Outbound — todo permitido ──────────────────────────────
  # Necesario para: DOCR pull, Supabase, OpenAI, Anthropic, Google APIs

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# ── Dominio y DNS ──────────────────────────────────────────────
# DNS gestionado en AWS Route 53 (el dominio tiene otros usos).
# Terraform NO crea registros DNS — se hace manualmente en Route 53.
#
# Después del `terraform apply`, agregar en Route 53:
#   Tipo: A
#   Nombre: <subdominio> (ej: app.ebuddy.io)
#   Valor: <IP del output droplet_ip>
#   TTL: 300
#
# Ver: terraform output droplet_ip
