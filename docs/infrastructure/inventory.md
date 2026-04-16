# Inventario de Infraestructura — Actual

> Entorno principal: prod/MVP
> Región: `nyc3`

---

## Resumen

| Recurso | Uso |
|---|---|
| Droplet | Ejecuta la app Next.js |
| DOCR | Almacena imágenes Docker |
| Reserved IP | Estabilidad del DNS |
| DO Spaces | Estado remoto de Terraform |
| PostgreSQL | Base de datos principal |

---

## Componentes activos

### Compute

| Recurso | Estado |
|---|---|
| `ebuddy-prod-droplet` | App en producción |
| Docker + Compose | Runtime |
| Caddy | TLS y reverse proxy |

### Datos

| Recurso | Estado |
|---|---|
| PostgreSQL | Fuente de verdad de la app |
| `drizzle/` | SQL versionado del repo |

### Infra de soporte

| Recurso | Estado |
|---|---|
| DOCR | Build/push desde CI |
| DO Spaces | Terraform state |
| Firewall + DNS | Gestionados por Terraform |

---

## Notas de mantenimiento

- La URL pública vigente debe tomarse de `infra/config/main.env`.
- Si cambian tamaño de Droplet, dominio o región, actualizar este documento y `docs/README.md`.
- Las referencias viejas a Supabase en esta carpeta deben considerarse históricas.
