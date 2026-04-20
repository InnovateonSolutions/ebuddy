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
        -> features/tickets/server/*
        -> features/calendar/server/*
        -> features/notifications/server/*
        -> features/status/server/*
        -> features/messaging/whatsapp/server/*
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

- `features/tickets/`
  Contiene UI, contratos y lógica de servidor para tickets y captura.
- `features/calendar/`
  Agrupa OAuth y lectura de calendarios por proveedor.
- `features/infra/`
  Reúne providers de monitoreo y la UI de Infra.
- `features/settings/`
  Agrupa componentes y flujos de configuración del usuario.
- `features/navigation/`
  Agrupa navegación pública y autenticada.
- `features/notifications/`
  Centraliza emails y ejecución de notificaciones programadas.
- `features/status/`
  Expone la fuente canónica de checks de salud del producto.
- `features/messaging/whatsapp/`
  Aísla challenge, parsing y replies del webhook de WhatsApp.
- `lib/`
  Conserva compatibilidad temporal y piezas shared como `db`, `auth`, `env`, `utils` y tipos públicos.

La intención es que páginas y routes sean delgadas y deleguen al dominio. Los
paths legacy en `lib/` y `components/` siguen existiendo como wrappers
compatibles mientras la suite estructural protege la migración.

---

## Flujos clave

### Captura de ticket

1. El usuario envía texto o audio a `POST /api/tickets/capture`.
2. Si hay audio, se transcribe con Whisper.
3. El texto se estructura con Claude.
4. El ticket se persiste en PostgreSQL vía Drizzle.

### Vista del día

1. La página o route obtiene tickets desde `features/tickets/server/queries.ts`.
2. Los eventos se cargan con `features/calendar/server/index.ts`.
3. La UI combina ambos conjuntos para mostrar el día actual.

### Notificaciones y estado

1. `POST /api/cron/due-notifications` valida el secreto de cron.
2. La ejecución delega en `features/notifications/server/service.ts`.
3. `GET /api/status` y `/status` leen checks desde `features/status/server/service.ts`.

### Captura por WhatsApp

1. Meta llama a `GET/POST /api/webhooks/whatsapp`.
2. La route delega challenge y parsing a `features/messaging/whatsapp/server/service.ts`.
3. El servicio usa `features/tickets/server/capture.ts` y `reply.ts` para responder.

---

## Decisiones relacionadas

| Documento | Estado |
|---|---|
| [ADR 001](adr/001-nextjs-monorepo.md) | Vigente |
| [ADR 003](adr/003-ai-providers.md) | Vigente |
