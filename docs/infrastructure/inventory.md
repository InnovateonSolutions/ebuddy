# Inventario de Infraestructura — DigitalOcean

> Entorno: **prod/MVP**
> Región: `nyc3`
> Última actualización: Marzo 2026
> IaC: `infra/terraform/` — provider `digitalocean/digitalocean ~> 2.40`

---

## Resumen de Costos

| Recurso | Tipo | Costo/mes |
|---|---|---|
| Droplet `ebuddy-prod-droplet` | `s-1vcpu-2gb` | $12 |
| IP Reservada | Reserved IP | $4 |
| Container Registry `ebuddy-prod` | Starter (gratis hasta 500 MB) | $0 |
| DO Spaces `ebuddy-tfstate` | Terraform state (~1 KB) | ~$0.25 |
| Monitoreo | DO Monitoring (incluido en Droplet) | $0 |
| **Total** | | **~$16/mes** |

> Supabase Cloud free tier cubre el MVP (base de datos, auth, realtime). Si supera los límites del free tier, el plan Pro de Supabase cuesta $25/mes.

---

## Compute

### Droplet `ebuddy-prod-droplet`

| Atributo | Valor |
|---|---|
| Región | `nyc3` |
| Tamaño | `s-1vcpu-2gb` (1 vCPU, 2 GB RAM, 50 GB SSD) |
| Imagen | Ubuntu 24.04 LTS (`ubuntu-24-04-x64`) |
| IP fija | Asignada via Reserved IP |
| VPC | `ebuddy-prod-vpc` (10.10.0.0/24) |
| Monitoreo | Activado (CPU, memoria, disco, ancho de banda) |

### Software en el Droplet (instalado via cloud-init)

| Software | Versión | Propósito |
|---|---|---|
| Docker Engine | latest | Runtime de containers |
| Docker Compose Plugin | latest | Orquestación app + Caddy |
| Caddy | 2-alpine | Reverse proxy + HTTPS automático (Let's Encrypt) |

### Containers en producción

| Container | Imagen | Rol |
|---|---|---|
| `app` | `registry.digitalocean.com/ebuddy-prod/ebuddy:latest` | Next.js app |
| `caddy` | `caddy:2-alpine` | Reverse proxy + TLS |

La app escucha en `127.0.0.1:3000` (solo localhost). Caddy la expone en `443` con HTTPS automático.

---

## Container Registry

### DOCR `ebuddy-prod`

| Atributo | Valor |
|---|---|
| Endpoint | `registry.digitalocean.com/ebuddy-prod` |
| Plan | Starter (gratis — 1 repositorio, 500 MB) |
| Región | `nyc3` |
| Tags activos | `latest`, `sha-<commit>` |
| Credentials pull | Docker config JSON en `/root/.docker/config.json` del Droplet |
| Credentials push | Docker config JSON en GitHub Actions secret `DO_REGISTRY_PUSH_CREDENTIALS` |

---

## Networking

### VPC `ebuddy-prod-vpc`

| Atributo | Valor |
|---|---|
| CIDR | `10.10.0.0/24` |
| Región | `nyc3` |

> No hay subnets públicas/privadas separadas ni NAT Gateway. El Droplet tiene IP pública directa con Firewall restrictivo.

### Firewall `ebuddy-prod-firewall`

| Dirección | Puerto | Protocolo | Origen | Propósito |
|---|---|---|---|---|
| Inbound | 22 | TCP | 0.0.0.0/0, ::/0 | SSH (GitHub Actions + admin) |
| Inbound | 80 | TCP | 0.0.0.0/0, ::/0 | HTTP (Caddy redirect a HTTPS) |
| Inbound | 443 | TCP | 0.0.0.0/0, ::/0 | HTTPS |
| Inbound | 443 | UDP | 0.0.0.0/0, ::/0 | HTTP/3 (QUIC) |
| Outbound | 1-65535 | TCP + UDP | 0.0.0.0/0, ::/0 | APIs externas (Supabase, OpenAI, etc.) |

El puerto `3000` de la app NO está expuesto — solo accesible desde `localhost` dentro del Droplet.

### IP Reservada

| Atributo | Valor |
|---|---|
| Costo | $4/mes (fija aunque se recree el Droplet) |
| Uso | Permite recrear el Droplet sin cambiar la IP del DNS |

### DNS (dominio gestionado por DO)

| Registro | Tipo | Valor |
|---|---|---|
| `@` (apex) | A | IP reservada del Droplet |
| `www` | CNAME | `@` |

---

## Secrets

Los secrets **no se almacenan** en ningún servicio de cloud. El flujo es:

```
GitHub Actions secrets
        │
        ▼ SSH en cada deploy
/opt/ebuddy/.env (chmod 600, solo readable por root)
        │
        ▼ docker compose env_file
Container process.env.*
```

Ver [gestión de secrets](secrets.md) para el procedimiento completo.

---

## Terraform State

| Atributo | Valor |
|---|---|
| Backend | DO Spaces (S3-compatible) |
| Bucket | `ebuddy-tfstate` |
| Key | `ebuddy/terraform.tfstate` |
| Región DO Spaces | `nyc3` |
| Credenciales | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` = Spaces keys (env vars locales) |
| Locking | No disponible en DO Spaces — no usar `terraform apply` concurrente |

---

## Monitoreo

| Alerta | Condición | Acción |
|---|---|---|
| `ebuddy-prod-cpu-high` | CPU > 85% durante 5 min | Email a `alert_email` |
| `ebuddy-prod-memory-high` | Memoria > 85% durante 5 min | Email a `alert_email` |
| `ebuddy-prod-disk-high` | Disco > 80% durante 5 min | Email a `alert_email` |
