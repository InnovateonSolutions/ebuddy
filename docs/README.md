# ebuddy — Documentación del Proyecto

> Plataforma de Gestión Personal + Profesional con IA
> Versión: MVP v1.0 · Costo objetivo: < $20/mes · Última actualización: Marzo 2026

---

## Índice

| Sección | Descripción |
|---|---|
| [Arquitectura](architecture/overview.md) | Visión general del sistema, decisiones de diseño |
| [ADRs](architecture/adr/) | Architecture Decision Records |
| [Inventario de Infraestructura](infrastructure/inventory.md) | Recursos DigitalOcean activos |
| [Redes](infrastructure/networking.md) | VPC, firewall, DNS, HTTPS |
| [Secrets](infrastructure/secrets.md) | Gestión de credenciales y rotación |
| [Homelab](infrastructure/homelab.md) | Mini PC (llega 19 abril 2026) — OpenClaw + modelos locales |
| [Inicio Local](development/getting-started.md) | Setup del entorno de desarrollo |
| [Variables de Entorno](development/environment-variables.md) | Referencia completa de env vars |
| [Runbook](operations/runbook.md) | Procedimientos operativos |
| [Monitoreo](operations/monitoring.md) | Alertas DO, logs Docker |
| [Seguridad](security/overview.md) | Postura de seguridad y compliance |
| [OpenClaw](integrations/openclaw.md) | Integración con mensajería (WhatsApp, Telegram, iMessage) |

---

## Estado actual del proyecto

| Componente | Estado |
|---|---|
| App Next.js (web + API) | Implementado |
| Deploy en DigitalOcean | Implementado (Terraform + GitHub Actions) |
| Supabase Cloud (DB + Auth + Realtime) | Implementado |
| CI/CD (DOCR + SSH deploy) | Implementado |
| OpenClaw skill (mensajería) | Pendiente — requiere mini PC (19 abril) |
| API Key endpoint | Pendiente — Fase 2 |
| Modelos IA locales (Ollama) | Pendiente — Fase 2 |

---

## Costo mensual

| Recurso | Costo |
|---|---|
| Droplet `s-1vcpu-2gb` | $12/mes |
| IP Reservada | $4/mes |
| Container Registry (starter) | $0 |
| Supabase Cloud (free tier) | $0 |
| DO Spaces (state Terraform) | ~$0.25/mes |
| OpenAI Whisper + Anthropic Claude | < $1/mes (1 usuario) |
| **Total** | **~$16/mes** |

---

## Stack de un vistazo

```
Frontend + Backend   Next.js 14 (App Router) · TypeScript estricto
Containerización     Docker multi-stage · node:20-alpine
Proxy / TLS          Caddy 2 — HTTPS automático (Let's Encrypt)
Registry             DigitalOcean Container Registry (DOCR)
Compute              DigitalOcean Droplet s-1vcpu-2gb (nyc3)
Base de datos        Supabase Cloud (PostgreSQL 15 + RLS + Realtime)
Autenticación        Supabase Auth · JWT · OAuth Google
Transcripción        OpenAI Whisper API
Motor de IA          Claude API — Anthropic (claude-sonnet-4-6)
Calendarios          Google Calendar API v3 · Microsoft Graph API
Mensajería [Fase 2]  OpenClaw en MINISFORUM UM890 Pro (Ryzen 9 8945HS)
CI/CD                GitHub Actions → DOCR → SSH deploy al Droplet
IaC                  Terraform >= 1.7 · DO Spaces remote state
```

---

## Estructura del repositorio

```
ebuddy/
├── app/                        Next.js App Router (páginas + API routes)
│   ├── (auth)/                 Login
│   ├── (dashboard)/            Today, Future, Settings
│   └── api/                    Endpoints REST
├── components/                 Componentes React
├── hooks/                      useAudioRecorder, useRealtimeTickets
├── lib/                        Módulos de negocio
│   ├── ai/                     Whisper + Claude services
│   ├── calendar/               OAuth Google + Microsoft
│   └── supabase/               Clientes browser/server
├── types/                      Tipos TypeScript compartidos
├── supabase/migrations/        Migraciones SQL versionadas
├── infra/terraform/            IaC DigitalOcean
├── .github/workflows/          Pipeline CI/CD
├── Dockerfile                  Build multi-stage (standalone)
├── docker-compose.yml          Entorno local de desarrollo
├── docker-compose.prod.yml     Compose en producción (referencia)
├── CLAUDE.md                   Contexto para Claude Code
└── docs/                       ← estás aquí
```

---

## Contacto y ownership

| Rol | Persona |
|---|---|
| Product Owner / Arquitecto / Dev / DevOps | Martín Cuevas Tavizón |
