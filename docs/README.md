# ebuddy — Documentación del Proyecto

> Índice de documentación viva del repo.
> Última actualización: Abril 2026.

---

## Fuentes de verdad

| Tema | Fuente |
|---|---|
| Proceso de trabajo para agentes | [`AGENTS.md`](../AGENTS.md) |
| Stack, organización y enlaces principales | `docs/README.md` |
| Configuración pública vigente del deploy | `infra/config/main.env` |
| Comportamiento real del sistema | Código del repositorio |

Si un documento contradice al código, el código manda y el documento debe actualizarse.

---

## Estado actual

| Área | Estado actual |
|---|---|
| App | Next.js 14 con App Router |
| DB | PostgreSQL + Drizzle ORM |
| Auth | `next-auth` v5 + middleware |
| IA | OpenAI Whisper + Anthropic Claude |
| Calendarios | Google Calendar API + Microsoft Graph |
| Infra | DigitalOcean Droplet + DOCR + Terraform |
| CI/CD | GitHub Actions |

---

## Costo de la solución integral

### Nosotros / proveedor

| Componente | Costo estimado |
|---|---|
| Droplet `s-1vcpu-2gb` | $12/mes |
| PostgreSQL administrado `db-s-1vcpu-1gb` | $15/mes |
| Reserved IP | $4/mes |
| DO Spaces (state Terraform) | ~$0.25/mes |
| DOCR | $0/mes en el uso actual documentado |
| IA (Whisper + Claude) | variable, base esperada `< $1/mes` en uso MVP ligero |
| **Total base proveedor** | **~$31.25/mes + uso variable de IA** |

### Cliente

| Componente | Costo estimado |
|---|---|
| Uso web en navegador | $0 incremental |
| Cuenta Google / Microsoft para calendario | depende de licencias del cliente; normalmente ya existentes |
| Dispositivo e internet | fuera del alcance de la solución |
| Dominio propio | $0 si usa nuestro dominio actual; variable si exige dominio suyo |
| **Total cliente** | **$0 incremental en el escenario hospedado actual, excluyendo licencias/servicios propios** |

### Notas

- Esta separación asume un modelo hospedado por nosotros, con una sola infraestructura compartida.
- Si el cliente exige infraestructura dedicada, el costo proveedor deja de ser compartido y pasa a imputarse a ese cliente.
- Los costos de Google Workspace, Microsoft 365, correo, telefonía o hardware del cliente no están incluidos porque no dependen del repo.

---

## Stack actual

```
Frontend / Backend   Next.js 14 · React 18 · TypeScript estricto
UI                   Tailwind CSS · shadcn/ui
DB                   PostgreSQL · Drizzle ORM
Auth                 next-auth v5
IA                   OpenAI Whisper · Anthropic Claude
Calendarios          Google Calendar API · Microsoft Graph
Deploy               DigitalOcean Droplet · Docker · Caddy
Infra                Terraform · DO Spaces remote state
Tests                pytest estructural · Vitest
```

---

## Organización actual del repo

```
ebuddy/
├── app/                        Páginas y Route Handlers
├── components/                 UI reutilizable
├── hooks/                      Hooks React activos
├── lib/
│   ├── ai/                     Integraciones de IA
│   ├── auth/                   Configuración de next-auth
│   ├── calendar/               Clientes Google/Microsoft
│   ├── db/                     Conexión y schema Drizzle
│   ├── calendar.ts             Agregación de calendario por dominio
│   ├── tickets.ts              Queries y helpers de tickets
│   └── types.ts                Tipos compartidos del dominio
├── drizzle/                    SQL versionado y metadatos
├── infra/terraform/            Infraestructura DigitalOcean
├── scripts/                    Utilidades operativas y tests estructurales
└── docs/                       Documentación
```

---

## Índice

| Documento | Propósito |
|---|---|
| [Arquitectura](architecture/overview.md) | Vista general actual del sistema |
| [C4 Nivel 1](architecture/c4-nivel-1-contexto.md) | Contexto del sistema actual |
| [C4 Nivel 2](architecture/c4-nivel-2-contenedores.md) | Contenedores del sistema actual |
| [ADRs](architecture/adr/) | Decisiones arquitectónicas y cambios históricos |
| [Inventario de Infraestructura](infrastructure/inventory.md) | Recursos activos y costos base |
| [Redes](infrastructure/networking.md) | Topología y exposición de red |
| [Secrets](infrastructure/secrets.md) | Gestión y rotación de credenciales |
| [Inicio Local](development/getting-started.md) | Levantar el entorno actual |
| [Variables de Entorno](development/environment-variables.md) | Referencia alineada con `.env.example` |
| [Seguridad](security/overview.md) | Controles actuales y supuestos de seguridad |
| [Runbook](operations/runbook.md) | Operación manual en producción |
| [Monitoreo](operations/monitoring.md) | Observabilidad y alertas |

---

## Notas

- Módulos actuales clave: `lib/types.ts`, `lib/tickets.ts`, `lib/calendar.ts`.
- Si un documento deja de ser útil o solo preserva contexto viejo, se elimina; el historial vive en git.
