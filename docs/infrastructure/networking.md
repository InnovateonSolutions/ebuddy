# Redes — ebuddy

> Configuración de red en DigitalOcean. Diseño simple: un Droplet con IP pública + Firewall restrictivo + Caddy como reverse proxy con HTTPS automático.

---

## Topología

```
Internet
    │
    │ HTTPS :443 / HTTP :80
    ▼
┌──────────────────────────────────────────────────┐
│  DigitalOcean Firewall (ebuddy-prod-firewall)     │
│  Permite: 22, 80, 443 TCP · 443 UDP              │
│  Bloquea: todo lo demás inbound                  │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│  Droplet: ebuddy-prod-droplet                    │
│  Ubuntu 24.04 · s-1vcpu-2gb · nyc3              │
│  IP: <reserved_ip>                               │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Docker Compose                            │  │
│  │                                            │  │
│  │  ┌──────────┐    ┌───────────────────────┐ │  │
│  │  │  Caddy   │───▶│  app (Next.js :3000)  │ │  │
│  │  │ :80/:443 │    │  127.0.0.1:3000       │ │  │
│  │  └──────────┘    │  (no expuesto extern.)│ │  │
│  │                  └───────────────────────┘ │  │
│  └────────────────────────────────────────────┘  │
│                         │                        │
└─────────────────────────┼────────────────────────┘
                          │ Outbound TCP 443
                          ▼
            ┌─────────────────────────┐
            │  APIs Externas (HTTPS)  │
            │  - Supabase Cloud       │
            │  - OpenAI Whisper       │
            │  - Anthropic Claude     │
            │  - Google Calendar API  │
            │  - Microsoft Graph API  │
            │  - DOCR (pull imágenes) │
            └─────────────────────────┘
```

---

## HTTPS — Caddy + Let's Encrypt

Caddy gestiona el certificado TLS automáticamente:

1. En el primer arranque, Caddy hace un challenge ACME con Let's Encrypt.
2. El certificado se almacena en el Docker volume `caddy_data` (persiste entre reinicios).
3. La renovación automática ocurre 30 días antes del vencimiento (90 días).

**No se necesita configurar ACM, Route53 ni ningún servicio adicional.** Solo apuntar el dominio al Droplet.

### Caddyfile

```
<domain_name> {
    reverse_proxy app:3000
}
```

HTTP → HTTPS redirect también lo maneja Caddy automáticamente.

---

## DNS

Nameservers de DigitalOcean gestionan el dominio:
```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

Registros DNS creados por Terraform:

| Registro | Tipo | Valor | TTL |
|---|---|---|---|
| `<domain>` | A | `<reserved_ip>` | 300s |
| `www.<domain>` | CNAME | `@` | 300s |

---

## Firewall

El Firewall de DigitalOcean actúa **antes** de que el tráfico llegue al Droplet (a nivel de red, no como iptables). Es la primera línea de defensa.

| Inbound | Puerto | Descripción |
|---|---|---|
| TCP | 22 | SSH — acceso admin + GitHub Actions deploy |
| TCP | 80 | HTTP — Caddy lo redirige a HTTPS |
| TCP | 443 | HTTPS |
| UDP | 443 | HTTP/3 (QUIC) |

Todo lo demás (incluyendo el puerto `3000` de Next.js) está bloqueado desde internet.

---

## Flujo de un request

```
1. Usuario → <domain>:443
2. DNS resuelve → Reserved IP
3. Firewall DO → permite TCP:443
4. Caddy recibe (TLS termination, certificado Let's Encrypt)
5. Caddy → reverse_proxy app:3000 (red interna Docker)
6. Next.js procesa el request
   ├── API Route con IA:
   │     Next.js → internet → OpenAI Whisper API
   │     Next.js → internet → Anthropic Claude API
   │     Next.js → internet → Supabase PostgreSQL
   └── API Route de calendario:
         Next.js → internet → Google Calendar / Microsoft Graph
7. Response → Next.js → Caddy → Usuario
```
