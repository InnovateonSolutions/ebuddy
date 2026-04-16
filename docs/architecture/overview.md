# Arquitectura — Visión General Actual

## Resumen

ebuddy es una app Next.js fullstack para capturar, clasificar y ejecutar tickets
personales y de negocio. La app corre en un Droplet de DigitalOcean y usa
PostgreSQL con Drizzle ORM.

---

## Stack arquitectónico actual

| Capa | Implementación actual |
|---|---|
| UI y server | Next.js 14 App Router |
| Auth | `next-auth` v5 |
| DB | PostgreSQL |
| ORM | Drizzle |
| IA | Whisper + Claude |
| Calendario | Google Calendar API + Microsoft Graph |
| Infra | Docker + Caddy + DigitalOcean |

---

## Componentes principales

```text
Browser
  -> Next.js app
     -> Route Handlers
        -> lib/tickets.ts
        -> lib/calendar.ts
        -> lib/ai/*
        -> lib/db/schema.ts + Drizzle
           -> PostgreSQL

Route Handlers
  -> OpenAI Whisper
  -> Anthropic Claude
  -> Google Calendar API
  -> Microsoft Graph
```

---

## Organización por dominio

- `lib/tickets.ts`
  Centraliza queries y composición de respuestas de tickets.
- `lib/calendar.ts`
  Centraliza carga agregada de eventos y refresh de tokens.
- `lib/types.ts`
  Define tipos compartidos y contratos API.
- `lib/db/`
  Contiene schema y conexión Drizzle.

La intención es que páginas y routes sean delgadas y deleguen al dominio.

---

## Flujos clave

### Captura de ticket

1. El usuario envía texto o audio a `POST /api/tickets/capture`.
2. Si hay audio, se transcribe con Whisper.
3. El texto se estructura con Claude.
4. El ticket se persiste en PostgreSQL vía Drizzle.

### Vista del día

1. La página o route obtiene tickets desde `lib/tickets.ts`.
2. Los eventos se cargan con `lib/calendar.ts`.
3. La UI combina ambos conjuntos para mostrar el día actual.

---

## Decisiones relacionadas

| Documento | Estado |
|---|---|
| [ADR 001](adr/001-nextjs-monorepo.md) | Vigente |
| [ADR 003](adr/003-ai-providers.md) | Vigente |
