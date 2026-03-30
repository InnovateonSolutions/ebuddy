# ebuddy — Plataforma de Gestión Personal + Profesional con IA
> MVP v1.0 · Martín Cuevas Tavizón · Marzo 2026

## Qué es este sistema

Aplicación web que centraliza todas las responsabilidades del usuario (trabajo, iniciativas propias, vida personal) en un único espacio inteligente. Captura inputs de voz o texto, los clasifica automáticamente en dos contextos (**Negocio** o **Personal**), genera tickets estructurados listos para ejecutar, y responde proactivamente a: **¿qué tengo que hacer ahora?**

El usuario es un solo founder (Martín). No hay clientes reales todavía. El MVP se valida con uso propio durante 2-4 semanas.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) · React · Tailwind CSS · shadcn/ui |
| Backend | Next.js API Routes compiladas como Vercel Serverless Functions |
| Base de datos | Supabase (PostgreSQL) con Row Level Security |
| Autenticación | Supabase Auth · JWT · Next.js Middleware (edge runtime) |
| Transcripción de voz | OpenAI Whisper API (REST/HTTPS) |
| Motor de IA | Claude API — Anthropic (claude-sonnet-4-6 o superior) |
| Calendarios | Google Calendar API v3 (OAuth2) · Microsoft Graph API (MSAL) |
| Deploy | Vercel (build automático en push a main, preview en PRs) |
| Lenguaje | TypeScript estricto en todo el proyecto |

---

## Arquitectura: 6 Contenedores

### 1. Web App — `Next.js 14 · React · Tailwind + shadcn/ui`
- Interfaz de usuario completa. Único punto de entrada del usuario.
- Renderiza: vista del día por contexto, formulario de captura con botón de grabación, lista de tickets, vista de horizonte futuro.
- **Regla crítica:** NUNCA accede directamente a la DB ni a servicios externos. Todo va por API Routes.
- Desktop-first en MVP. Mobile-responsive es bonus, no requisito bloqueante.
- Usa Supabase Realtime para actualizar tickets en pantalla sin polling ni recarga.

### 2. API Routes — `Next.js API Routes · Vercel Serverless Functions`
- Orquestador del backend. Coordina el flujo entre todos los contenedores internos.
- **Endpoints principales:**
  - `POST /api/tickets/capture` — recibe audio (multipart) o texto
  - `GET /api/tickets/today` — plan del día
  - `GET /api/tickets/future` — horizonte futuro
  - `PATCH /api/tickets/:id` — actualizar estado
  - `GET /api/calendar/events` — agenda del día
- **Seguridad:** todas las rutas validadas por Auth Middleware antes de procesarse. Nunca expone credenciales de APIs externas al cliente.
- Lee/escribe en Database via Supabase JS SDK.

### 3. IA Processing Worker — `Vercel Function · TypeScript`
- Toda la lógica de inteligencia artificial. Aislada para cambiar de proveedor sin afectar el resto.
- **Flujo:** audio → Whisper API → texto · texto + contexto → Claude API → JSON ticket estructurado.
- Timeout configurado a 30 segundos en Vercel.
- Las llamadas a Whisper y Claude están encapsuladas en interfaces: `ITranscriptionService`, `IAIService`.
- **El audio NO se almacena.** Solo se persiste el texto transcrito.

### 4. Calendar Service — `Vercel Function · Google API · MSAL`
- Gestión completa de integración con calendarios externos. Aislado de la lógica de negocio.
- Lee eventos del día actual y siguientes 7 días: título, hora inicio/fin, descripción, ubicación.
- Los tokens OAuth (access + refresh) se almacenan cifrados en Supabase.
- Renueva tokens automáticamente cuando expiran.
- **MVP scope:** solo lectura. Escritura de eventos en calendarios queda para Fase 2.

### 5. Auth Middleware — `Supabase Auth · JWT · Next.js Middleware (edge)`
- Gate de seguridad que protege todas las API Routes.
- **Flujo:** login → JWT emitido por Supabase → JWT en header `Authorization` → Middleware valida firma y expiración → adjunta `userId` al request context.
- Login por: email + password, OAuth Google (recomendado), magic link.

### 6. Database — `Supabase (PostgreSQL) · Row Level Security`
- Única fuente de verdad. Acceso via Supabase JS SDK desde las funciones serverless.
- RLS activo en todas las tablas. Segunda línea de defensa: aunque haya un bug en el middleware, la DB nunca devuelve datos de otro usuario.
- Supabase Realtime habilitado en tabla `tickets` para actualizaciones en vivo.

---

## Esquema de Base de Datos

### `tickets`
```sql
id           uuid PK
user_id      uuid FK → users   -- usado por RLS
title        text               -- generado por Claude API
context      enum               -- NEGOCIO | PERSONAL
overview     text               -- descripción completa generada por IA
what_to_do   text               -- acción concreta
next_steps   text[]             -- array de siguientes pasos ordenados
priority     enum               -- ALTA | MEDIA | BAJA (inferida por IA)
status       enum               -- PENDING | IN_PROGRESS | DONE
due_date     date nullable      -- null = sin fecha definida
raw_input    text               -- texto original del usuario
created_at   timestamptz
```

### `users`
```sql
id            uuid PK           -- generado por Supabase Auth
email         text unique
display_name  text
created_at    timestamptz
```

### `calendar_tokens`
```sql
user_id       uuid FK → users
provider      enum              -- GOOGLE | MICROSOFT
access_token  text encrypted
refresh_token text encrypted
expires_at    timestamptz
```

### `user_preferences`
```sql
user_id     uuid FK → users
timezone    text               -- ej: America/Tijuana
work_start  time
work_end    time
```

---

## Flujos Principales

### Flujo A: Captura de ticket por voz
1. Usuario graba audio en Web App (Web Audio API).
2. Web App → `POST /api/tickets/capture` (FormData multipart).
3. Auth Middleware valida JWT.
4. API Routes llama al IA Processing Worker.
5. IA Worker → OpenAI Whisper API → texto transcrito en español.
6. IA Worker construye prompt + llama a Claude API.
7. Claude devuelve JSON: `{ context, title, overview, what_to_do, next_steps, priority }`.
8. API Routes guarda ticket en DB. **El audio se descarta.**
9. Web App recibe el ticket. Aparece en pantalla via Supabase Realtime. **Tiempo total: < 5 segundos.**

### Flujo B: Consulta del plan del día
1. Web App → `GET /api/tickets/today`.
2. Auth Middleware valida JWT.
3. API Routes consulta en paralelo: (a) tickets del día en DB y (b) eventos en Calendar Service.
4. Calendar Service lee eventos desde Google Calendar y/o Outlook con tokens OAuth.
5. API Routes combina tickets + eventos. Organiza por contexto (Negocio/Personal) y horario.
6. Web App renderiza vista del día integrada en orden cronológico.

---

## Prompt Engineering — Claude API

El system prompt de Claude debe incluir:
- Instrucciones de clasificación: decidir NEGOCIO o PERSONAL basado en el contenido.
- Formato de output: **JSON obligatorio**, sin texto adicional fuera del JSON.
- Estructura exacta del JSON:
```json
{
  "context": "NEGOCIO | PERSONAL",
  "title": "string corto y accionable",
  "overview": "descripción completa del tema",
  "what_to_do": "acción concreta e inmediata",
  "next_steps": ["paso 1", "paso 2", "paso 3"],
  "priority": "ALTA | MEDIA | BAJA"
}
```
- Ejemplos few-shot en español para consistencia.
- Idioma: español siempre.

---

## Convenciones de Código

- **TypeScript estricto** (`strict: true`) en todo el proyecto. Sin `any` explícitos.
- Monorepo Next.js fullstack — un solo repositorio, un solo deploy.
- Estructura de carpetas App Router:
  ```
  app/
    (auth)/          -- páginas de autenticación
    (dashboard)/     -- vistas principales (today, future, settings)
    api/
      tickets/       -- endpoints de tickets
      calendar/      -- endpoints de calendario
  components/        -- componentes React reutilizables
  lib/
    supabase/        -- cliente Supabase y helpers
    ai/              -- ITranscriptionService, IAIService y sus implementaciones
    calendar/        -- lógica OAuth y lectura de calendarios
  types/             -- tipos TypeScript compartidos
  ```
- Interfaces primero: `ITranscriptionService` e `IAIService` antes de implementar los clientes concretos.
- Variables de entorno con prefijo claro:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

---

## Reglas de Negocio Críticas

1. **Clasificación dual obligatoria:** todo ticket debe tener `context = NEGOCIO | PERSONAL`. No hay categoría "otro" ni "sin clasificar".
2. **El audio nunca se persiste.** Procesar y descartar inmediatamente después de la transcripción.
3. **RLS en todas las tablas.** Un usuario nunca debe ver datos de otro usuario. Si hay duda, verificar la política RLS antes de hacer la consulta.
4. **Frontend nunca llama directamente a APIs externas.** Todo pasa por API Routes. El cliente nunca recibe ni maneja claves de API.
5. **Timeout IA Worker: 30 segundos.** Si Whisper + Claude superan ese tiempo, responder con error claro al usuario.
6. **Calendario solo lectura en MVP.** No implementar escritura de eventos en Google Calendar ni Outlook hasta Fase 2.

---

## Scope MVP — MoSCoW

> Este es un entorno de **desarrollo/validación** de uso propio. Priorizar velocidad de iteración y costo < $35/mes sobre completitud de features.

### Must Have (MVP — construir ahora)
- Captura de input por **voz** (Whisper API)
- Captura de input por **texto** directo
- **Clasificación automática**: Negocio / Personal (Claude API)
- **Ticket estructurado**: título, overview, qué hacer, siguientes pasos, prioridad
- **Vista del día**: tickets del día por contexto + eventos de calendario
- **Vista de horizonte futuro**: tickets sin fecha o con fecha futura, paginados
- **Lectura de Google Calendar** con OAuth2
- **Autenticación**: email + OAuth Google (Supabase Auth)
- **Actualización en tiempo real** de tickets en UI (Supabase Realtime)
- Web app **desktop-first**, responsive es bonus

### Should Have (antes de abrir a más usuarios)
- Lectura de Microsoft Outlook Calendar
- Cambio de estado de tickets (PENDING → IN_PROGRESS → DONE)
- Rate limiting por userId en API Routes
- Configuración de timezone y horario de trabajo en Settings
- Tests de integración para políticas RLS

### Could Have (Fase 2 — post validación)
- Escritura de eventos en Google Calendar / Outlook
- Notificaciones push / email de recordatorio
- Integración con Slack (enviar ticket desde mensaje)
- Búsqueda y filtrado de tickets históricos
- Tags o etiquetas adicionales a los dos contextos

### Won't Have (explícitamente fuera de scope)
- App móvil nativa (iOS / Android)
- Multi-tenant y billing
- Modo offline / PWA
- Multi-idioma (solo español)
- Integraciones con Jira, Notion, Trello

---

## Atributos de Calidad

| Atributo | Meta |
|---|---|
| Rendimiento | P95 < 5s end-to-end (Whisper + Claude + DB) |
| Disponibilidad | 99% uptime en horario 6am-10pm (Vercel SLA) |
| Seguridad | JWT en todas las peticiones + RLS en DB + HTTPS everywhere |
| Privacidad | Audio procesado y descartado. Solo texto transcrito en DB |
| Usabilidad | Primer ticket en < 2 minutos desde el registro |

---

## Seguridad — Estándares y Reglas

### Autenticación y Autorización
- **JWT en cada petición.** El Middleware valida firma + expiración antes de ejecutar cualquier lógica de negocio.
- **`userId` nunca viene del cliente.** Siempre se extrae del JWT validado, nunca de query params ni body.
- **RLS como segunda línea de defensa.** Aunque falle el Middleware, Supabase RLS garantiza aislamiento de datos. Las políticas deben estar activas en todas las tablas sin excepción.
- **Supabase Service Role Key** solo se usa en funciones serverless (server-side). Nunca en el cliente ni en variables `NEXT_PUBLIC_*`.
- **Rotación de tokens OAuth:** los refresh tokens de Google/Outlook se almacenan cifrados en DB. El Calendar Service renueva el access token automáticamente sin intervención del usuario.

### Gestión de Secretos
- Todas las claves de API viven en variables de entorno de Vercel. Nunca en el código fuente ni en commits.
- `.env.local` en `.gitignore` siempre. El repositorio nunca contiene credenciales reales.
- Variables del cliente solo con prefijo `NEXT_PUBLIC_` y solo si son seguras de exponer (Supabase URL y anon key son diseñadas para ser públicas).
- Patrón para acceder a env vars en server-side:
```typescript
// lib/env.ts — validar en startup, no en runtime
const requiredEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
] as const

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`)
})
```

### Validación de Inputs
- **Nunca confiar en el cliente.** Validar tamaño, tipo y contenido de todos los inputs en API Routes.
- Audio: validar que el archivo es `audio/*`, tamaño máximo 10MB, duración máxima razonable.
- Texto: longitud máxima explícita (ej. 2000 caracteres) para evitar prompts gigantes a Claude API.
- Usar `zod` para validar el body de cada endpoint:
```typescript
import { z } from 'zod'

const CaptureTextSchema = z.object({
  text: z.string().min(1).max(2000),
})
```
- Validar también la respuesta JSON de Claude API con `zod` antes de persistir en DB.

### Headers de Seguridad HTTP
Configurar en `next.config.ts`:
```typescript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'microphone=(self)' }, // solo micrófono en origin propio
]
```

### Protección contra Ataques Comunes
- **SQL Injection:** imposible usando Supabase JS SDK (queries parametrizadas por defecto). Nunca construir queries SQL con interpolación de strings.
- **XSS:** Next.js escapa contenido por defecto. No usar `dangerouslySetInnerHTML` con datos del usuario.
- **Rate limiting:** en MVP de un usuario no es crítico, pero preparar la API para añadir rate limiting por `userId` en Fase 2 sin refactorización mayor.
- **CORS:** Vercel restringe origins por defecto. No habilitar CORS abierto (`*`) en las API Routes.
- **Prompt injection:** sanitizar el input del usuario antes de insertarlo en el prompt de Claude. Encapsular el texto del usuario entre delimitadores claros:
```
<user_input>
{texto del usuario aquí}
</user_input>
```

### Privacidad de Datos
- Audio: se procesa en memoria y se descarta inmediatamente. Nunca se escribe a disco ni a storage.
- `raw_input` en DB contiene solo el texto (transcrito o directo), nunca el audio binario.
- Los tokens OAuth se almacenan con cifrado en reposo (columna `text encrypted` en Supabase Vault o `pgsodium`).

---

## Escalabilidad — Estándares y Patrones

### Arquitectura Stateless
- Las Vercel Functions no mantienen estado entre invocaciones. Todo el estado vive en Supabase.
- No usar variables globales en módulos para estado de sesión. Cada invocación es independiente.
- El cliente Supabase se inicializa por request, no como singleton global en funciones serverless.

### Base de Datos — Índices Obligatorios
Crear estos índices desde las primeras migraciones:
```sql
-- Consultas más frecuentes
CREATE INDEX idx_tickets_user_date ON tickets(user_id, due_date);
CREATE INDEX idx_tickets_user_status ON tickets(user_id, status);
CREATE INDEX idx_tickets_user_context ON tickets(user_id, context);
CREATE INDEX idx_calendar_tokens_user_provider ON calendar_tokens(user_id, provider);
```
Sin estos índices, las queries degradan con el tiempo. Crear en la migración inicial, no después.

### Paginación desde el Inicio
- Nunca hacer `SELECT *` sin `LIMIT`. Aunque el MVP tenga pocos datos, el patrón debe estar desde el principio.
- `GET /api/tickets/future` y listas históricas: cursor-based pagination, no offset.
```typescript
// Patrón de cursor pagination con Supabase
const { data } = await supabase
  .from('tickets')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20)
  .lt('created_at', cursor ?? new Date().toISOString())
```

### Llamadas en Paralelo
- `GET /api/tickets/today` consulta tickets del día y eventos del calendario en paralelo, nunca en serie:
```typescript
const [tickets, calendarEvents] = await Promise.all([
  getTicketsForToday(userId),
  getCalendarEvents(userId),
])
```

### Cold Start de Serverless
- Las funciones críticas (API Routes de tickets) se mantienen "calientes" por el uso frecuente.
- IA Worker puede tener cold start en la primera petición del día — aceptable en MVP.
- Para Fase 2 con más usuarios: considerar Vercel Pro con instancias "fluid compute" o warmup cron.

### Manejo de Errores — Patrón Consistente
Todas las API Routes devuelven el mismo formato de error:
```typescript
// types/api.ts
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string }

// Ejemplo en un endpoint
return Response.json(
  { success: false, error: 'Timeout procesando audio', code: 'AI_TIMEOUT' },
  { status: 504 }
)
```
- El cliente maneja errores por `code`, no por texto del mensaje.
- Nunca exponer stack traces ni mensajes internos al cliente.

### Logging Estructurado
- Loggear en formato JSON para que Vercel pueda indexar y filtrar.
- Incluir siempre: `userId`, `requestId`, `durationMs`, `endpoint`.
- **Nunca loggear:** tokens OAuth, claves de API, contenido de audio, texto completo del usuario.
```typescript
console.log(JSON.stringify({
  event: 'ticket.created',
  userId,
  ticketId: ticket.id,
  context: ticket.context,
  durationMs: Date.now() - startTime,
}))
```

### Resiliencia ante Fallos de APIs Externas
- **Whisper o Claude no responden:** devolver error HTTP 504 con mensaje claro. El usuario puede reintentar.
- **Token OAuth expirado:** el Calendar Service intenta renovarlo automáticamente. Si falla, devolver error específico `CALENDAR_AUTH_REQUIRED` para que el frontend muestre el flujo de re-autorización.
- **Supabase no disponible:** Vercel Functions fallarán. No implementar fallback en MVP — registrar el error y dejar que el usuario reintente.
- Patrón retry solo para renovación de tokens OAuth (max 1 reintento). No implementar retry genérico en MVP.

### Migraciones de DB
- Usar Supabase Migrations (`supabase/migrations/`) versionadas en git.
- Nunca modificar tablas en producción manualmente desde el dashboard. Todo cambio como migración.
- Cada migración debe ser reversible (incluir `down` migration).
- Añadir columnas como `nullable` o con `DEFAULT` para no romper producción durante el deploy.

### Monitoreo de Costos
- Configurar alertas de gasto en dashboards de OpenAI y Anthropic antes de empezar.
- Costo estimado MVP (1 usuario): < $10 USD/mes.
- Si el costo supera $20/mes, revisar si hay loops de llamadas o inputs sin validar longitud.

---

## Testing — Qué testear y qué no

### Testear (lógica de negocio core)
- Parsing y validación del JSON de Claude API con inputs malformados.
- Lógica de clasificación de contexto cuando la respuesta de IA es ambigua.
- Renovación automática de tokens OAuth (mock de Google/Microsoft).
- Políticas RLS: test de integración que verifica que usuario A no puede leer datos de usuario B.

### No testear en MVP
- Componentes visuales de React (costo alto, valor bajo en MVP).
- Llamadas directas a Whisper/Claude (son APIs externas, mockearlas es suficiente).
- Flujos de autenticación de Supabase Auth (ya están testeados por Supabase).

### Herramienta
- `vitest` para unit/integration tests en TypeScript. Sin Jest (más lento, configuración más compleja con ESM).
- Tests de integración de RLS: usar el Supabase CLI local (`supabase start`) para correr PostgreSQL local.
