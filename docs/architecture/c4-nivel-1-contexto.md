# C4 Nivel 1 — Contexto del Sistema

> Representación del sistema actual del repositorio.

---

## Descripción

ebuddy es una aplicación web fullstack para capturar, organizar y ejecutar
tickets personales y de negocio. El usuario interactúa por navegador y la app
se integra con proveedores externos de IA y calendario. La persistencia usa
PostgreSQL con Drizzle ORM y la identidad de usuario se gestiona con `next-auth`.

---

## Diagrama

```mermaid
C4Context
  title C4 Nivel 1 — Contexto del Sistema

  Person(user, "Usuario", "Captura tickets, consulta el día y gestiona estados desde la web.")

  System(ebuddy, "ebuddy", "Next.js fullstack", "App web con UI, autenticación, API y dominio de tickets.")

  System_Ext(openai, "OpenAI Whisper API", "Transcribe audio a texto")
  System_Ext(anthropic, "Anthropic Claude API", "Clasifica y estructura tickets")
  System_Ext(google, "Google Calendar API", "Lee eventos del calendario")
  System_Ext(microsoft, "Microsoft Graph", "Lee eventos de Outlook")
  System_Ext(db, "PostgreSQL", "Base de datos principal")

  Rel(user, ebuddy, "Usa la app web", "HTTPS")
  Rel(ebuddy, openai, "Transcribe audio", "HTTPS")
  Rel(ebuddy, anthropic, "Estructura tickets", "HTTPS")
  Rel(ebuddy, google, "Consulta eventos", "HTTPS")
  Rel(ebuddy, microsoft, "Consulta eventos", "HTTPS")
  Rel(ebuddy, db, "Lee y escribe datos", "SQL")
```

---

## Elementos

| Elemento | Rol |
|---|---|
| Usuario | Usa la app desde navegador |
| ebuddy | Sistema central |
| PostgreSQL + Drizzle | Persistencia y acceso a datos |
| OpenAI Whisper | Transcripción de audio |
| Anthropic Claude | Estructuración y clasificación |
| Google Calendar / Microsoft Graph | Lectura de agenda |

---

## Notas

- La autenticación de usuario ocurre dentro de ebuddy usando `next-auth`.
- El frontend no llama proveedores externos directamente.
- Toda integración externa pasa por la app.
