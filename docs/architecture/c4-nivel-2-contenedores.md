# C4 Nivel 2 — Contenedores

> Contenedores lógicos del sistema actual.

---

## Diagrama

```mermaid
C4Container
  title C4 Nivel 2 — Contenedores

  Person(user, "Usuario", "Usa la app desde navegador")

  System_Boundary(ebuddy, "ebuddy") {
    Container(web, "Web App", "Next.js 14 + React", "Renderiza vistas, formularios y navegación")
    Container(api, "Route Handlers", "Next.js", "Endpoints de tickets, auth, calendario y health")
    Container(auth, "Auth", "next-auth v5", "Gestiona sesión e identidad")
    Container(domain, "Dominio", "TypeScript", "Lógica compartida en lib/tickets.ts, lib/calendar.ts y lib/ai/*")
    ContainerDb(db, "PostgreSQL", "PostgreSQL + Drizzle", "Persistencia principal")
  }

  System_Ext(openai, "OpenAI Whisper API", "Transcripción")
  System_Ext(anthropic, "Anthropic Claude API", "Clasificación")
  System_Ext(google, "Google Calendar API", "Calendario")
  System_Ext(microsoft, "Microsoft Graph", "Calendario")

  Rel(user, web, "Usa", "HTTPS")
  Rel(web, auth, "Inicia y mantiene sesión")
  Rel(web, api, "Consume endpoints", "HTTPS")
  Rel(api, auth, "Valida sesión")
  Rel(api, domain, "Delega lógica")
  Rel(domain, db, "Lee y escribe", "Drizzle ORM")
  Rel(domain, openai, "Transcribe audio", "HTTPS")
  Rel(domain, anthropic, "Estructura tickets", "HTTPS")
  Rel(domain, google, "Consulta eventos", "HTTPS")
  Rel(domain, microsoft, "Consulta eventos", "HTTPS")
```

---

## Contenedores

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
| Web App | Next.js + React | UI y experiencia del usuario |
| Route Handlers | Next.js | Exposición de APIs internas |
| Auth | `next-auth` | Sesiones e identidad |
| Dominio | TypeScript | Tickets, calendario e IA |
| Base de Datos | PostgreSQL + Drizzle | Persistencia |

---

## Mapeo al repo

| Contenedor | Ubicación principal |
|---|---|
| Web App | `app/`, `components/` |
| Route Handlers | `app/api/` |
| Auth | `lib/auth/`, `middleware.ts` |
| Dominio | `lib/tickets.ts`, `lib/calendar.ts`, `lib/ai/` |
| Base de Datos | `lib/db/`, `drizzle/` |
