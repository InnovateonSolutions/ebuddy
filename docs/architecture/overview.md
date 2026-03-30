# Arquitectura — Visión General

## Problema que resuelve

Los profesionales modernos gestionan múltiples contextos de vida simultáneamente con herramientas desconectadas. ebuddy centraliza captura, clasificación automática y visibilidad del día en una sola plataforma con IA.

---

## Arquitectura completa (actual + roadmap)

```
╔══════════════════════════════════════════════════════════════════╗
║  FASE 1 — MVP (activo)                                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Browser (desktop)                                               ║
║      │ HTTPS                                                     ║
║      ▼                                                           ║
║  Caddy (TLS automático, Let's Encrypt)                           ║
║      │                                                           ║
║      ▼                                                           ║
║  ┌──────────────────────────────────────────┐                   ║
║  │  DigitalOcean Droplet (nyc3, $12/mes)    │                   ║
║  │  Next.js 14 — App + API Routes           │                   ║
║  │  ├── Web App (React + Tailwind)          │                   ║
║  │  ├── POST /api/tickets/capture           │ ──▶ OpenAI Whisper ║
║  │  ├── GET  /api/tickets/today             │ ──▶ Anthropic Claude║
║  │  ├── GET  /api/tickets/future            │ ──▶ Supabase Cloud ║
║  │  ├── GET  /api/calendar/events           │ ──▶ Google Calendar ║
║  │  └── Auth Middleware (JWT + RLS)         │ ──▶ Microsoft Graph ║
║  └──────────────────────────────────────────┘                   ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  FASE 2 — OpenClaw + Mini PC (pendiente, llega 19 abril 2026)   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  MINISFORUM UM890 Pro (Ryzen 9 8945HS, homelab)                 ║
║  └── OpenClaw (asistente IA local)                              ║
║      ├── WhatsApp ──┐                                           ║
║      ├── Telegram ──┤──▶ skill ebuddy ──▶ POST /api/tickets/   ║
║      ├── iMessage ──┘          capture  (Droplet, HTTPS)        ║
║      └── 50+ apps más                                           ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## C4 Level 1 — Contexto del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [Martín]                                                  │
│   Usuario principal                                         │
│       │                                                     │
│       ├── Browser (web app)                                 │
│       └── WhatsApp / Telegram / iMessage (via OpenClaw)     │
│                    │                                        │
│                    ▼                                        │
│   ┌─────────────────────────────────────────────────┐       │
│   │          Plataforma de Gestión con IA            │       │
│   │                  [ebuddy]                        │       │
│   └─────────────────────────────────────────────────┘       │
│       │              │              │              │         │
│  Whisper API    Claude API    Google Cal.    Supabase        │
│  (voz→texto)   (clasificar)   (OAuth2)    (DB + Auth)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## C4 Level 2 — Contenedores

```
Browser / OpenClaw (Mini PC)
  │
  │ HTTPS
  ▼
Caddy (reverse proxy, Let's Encrypt automático)
  │
  │ HTTP localhost:3000
  ▼
┌─────────────────────────────────────────────────────────────────┐
│  DigitalOcean Droplet — Docker Compose                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 App (Docker)                                  │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌─────────────────────────────────┐   │   │
│  │  │  Web App     │  │  API Routes                     │   │   │
│  │  │  React       │  │                                 │   │   │
│  │  │  Tailwind    │  │  POST /api/tickets/capture      │   │   │
│  │  │  Supabase    │  │  GET  /api/tickets/today        │   │   │
│  │  │  Realtime    │  │  GET  /api/tickets/future       │   │   │
│  │  └──────────────┘  │  PATCH /api/tickets/:id         │   │   │
│  │                    │  GET  /api/calendar/events      │   │   │
│  │                    │  GET  /api/tickets/summary  [2] │   │   │
│  │                    │  POST /api/auth/api-key     [2] │   │   │
│  │                    │  GET  /api/health               │   │   │
│  │                    └─────────────────────────────────┘   │   │
│  │                              │                            │   │
│  │              ┌───────────────┼───────────────┐            │   │
│  │              ▼               ▼               ▼            │   │
│  │  ┌─────────────────┐ ┌────────────┐ ┌──────────────┐     │   │
│  │  │  IA Worker      │ │  Calendar  │ │  Auth        │     │   │
│  │  │  (lib/ai/)      │ │  Service   │ │  Middleware  │     │   │
│  │  │  Whisper        │ │ (lib/cal/) │ │  JWT + [2]   │     │   │
│  │  │  Claude API     │ │ Google     │ │  API Key     │     │   │
│  │  └────────┬────────┘ │ Microsoft  │ └──────────────┘     │   │
│  │           │          └─────┬──────┘                      │   │
│  └───────────┼────────────────┼───────────────────────────────┘  │
└──────────────┼────────────────┼───────────────────────────────────┘
               │                │
    ┌──────────┴───┐     ┌──────┴──────────────┐
    │ External APIs│     │ Supabase Cloud       │
    │              │     │ PostgreSQL + Auth    │
    │ OpenAI       │     │ Realtime             │
    │ Anthropic    │     │ RLS en todas tablas  │
    │ Google Cal.  │     └─────────────────────┘
    │ MS Graph     │
    └──────────────┘

[2] = pendiente de implementación (Fase 2 — OpenClaw)
```

---

## Flujos principales

### Flujo A — Captura de ticket por voz / texto (web, activo)

```
Usuario graba audio o escribe texto
      │
      ▼
POST /api/tickets/capture (FormData multipart o JSON)
      │
      ├─ Auth Middleware valida JWT (Supabase)
      ├─ Si audio: WhisperTranscriptionService → texto en español
      ├─ ClaudeAIService → JSON validado con Zod
      │    { context, title, overview, what_to_do, next_steps, priority }
      ├─ Supabase INSERT tickets (audio descartado inmediatamente)
      └─ Supabase Realtime → ticket aparece en UI (< 5s end-to-end)
```

### Flujo B — Plan del día (activo)

```
GET /api/tickets/today
      │
      ├─ Auth Middleware valida JWT
      ├─ Promise.all([
      │     getTicketsForToday(userId),     ← Supabase
      │     fetchCalendarEvents(userId)     ← Google/Microsoft OAuth
      │  ])
      └─ Response: { tickets: {negocio, personal}, calendar_events, date }
```

### Flujo C — Captura desde mensajería (Fase 2, pendiente)

```
"Necesito revisar propuesta para cliente X"
      │ WhatsApp / Telegram / iMessage
      ▼
OpenClaw (Mini PC — Ryzen 9, local)
      │ POST /api/tickets/capture
      │ Authorization: Bearer ebdy_live_...
      ▼
Auth Middleware valida API Key (hash en DB)
      │
      └─ mismo flujo que Flujo A → ticket creado
```

---

## Decisiones de arquitectura

| # | Decisión | Estado |
|---|---|---|
| [001](adr/001-nextjs-monorepo.md) | Next.js monorepo fullstack | Aceptado |
| [002](adr/002-supabase-baas.md) | Supabase como BaaS (DB + Auth + Realtime) | Aceptado |
| [003](adr/003-ai-providers.md) | OpenAI Whisper + Anthropic Claude | Aceptado |
| [004](adr/004-ecs-fargate.md) | DigitalOcean Droplet sobre AWS ECS | Aceptado |
| [005](adr/005-openclaw-homelab.md) | OpenClaw en Mini PC como cliente de ebuddy | Aceptado — pendiente implementación |

---

## Atributos de calidad

| Atributo | Meta | Cómo se mide |
|---|---|---|
| Rendimiento | P95 < 5s end-to-end | Logs estructurados `durationMs` |
| Disponibilidad | 99% en horario 6am–10pm | DO Monitoring alerta + docker healthcheck |
| Seguridad | JWT + API Key + RLS + TLS 1.3 | Audit logs Supabase + Caddy logs |
| Privacidad | Audio nunca persiste | Code review del endpoint capture |
| Costo | < $20 USD/mes (MVP) | DO Billing + OpenAI/Anthropic dashboards |
