# Plan de Trabajo — MVP Asistente Personal con IA
> Martín Cuevas Tavizón · Abril 2026  
> Importar a Jira como Epics + Stories

---

## MoSCoW — Resumen ejecutivo

| Prioridad | Qué incluye |
|---|---|
| **Must Have** | Todo lo necesario para el flujo: WhatsApp → OpenClaw → ticket en la web |
| **Should Have** | Lo que hace el MVP usable y estable (HTTPS, manejo de errores, logs) |
| **Could Have** | Mejoras post-validación (calendario, vista futura, respuesta enriquecida) |
| **Won't Have** | Explícitamente fuera de alcance en esta fase |

---

## Epics

| ID | Epic | Prioridad |
|---|---|---|
| EP-01 | Infraestructura & DevOps | Must Have |
| EP-02 | Base de Datos & API Backend | Must Have |
| EP-03 | Plataforma Web (Frontend) | Must Have |
| EP-04 | Integración OpenClaw + WhatsApp | Must Have |
| EP-05 | Motor de IA — Clasificación con Claude | Must Have |

---

## EP-01 · Infraestructura & DevOps

> Provisionar todo el entorno donde corre la plataforma web.

### MUST HAVE

**EP-01-01 · Provisionar DO Managed PostgreSQL**
- Crear instancia DO Managed Database (PostgreSQL 16) en nyc3
- Configurar usuario de aplicación con permisos mínimos (no superuser)
- Verificar conectividad desde Droplet
- Guardar connection string en GitHub Secrets

**EP-01-02 · Provisionar DO Droplet**
- Crear Droplet `s-1vcpu-2gb` en nyc3 con Docker preinstalado
- Configurar firewall: solo puertos 80, 443 y 22 (SSH restringido a IP fija)
- Subir llave SSH de deploy
- Verificar que Docker corre correctamente

**EP-01-03 · CI/CD — GitHub Actions (build + deploy)**
- Workflow `deploy.yml`: push a `main` → build imagen Docker → push a DOCR → SSH deploy al Droplet
- Build multi-stage: compilación → imagen standalone mínima
- Variables de entorno: combinar `infra/config/main.env` + GitHub Secrets
- Test de smoke post-deploy: `GET /api/health` retorna `{ ok: true }`

**EP-01-04 · Dominio + HTTPS (Caddy)**
- Configurar Caddy como reverse proxy con Let's Encrypt automático
- Apuntar dominio al Droplet (A record)
- Verificar HTTPS funcionando en producción
- Configurar headers de seguridad (X-Frame-Options, CSP, etc.)

**EP-01-05 · Docker Compose producción**
- `docker-compose.prod.yml`: servicio web app + Caddy
- Health check configurado (`/api/health`)
- Restart policy: `unless-stopped`
- Logs estructurados visibles con `docker logs`

### SHOULD HAVE

**EP-01-06 · Monitoreo básico**
- Alerta de DO Monitoring: CPU > 80%, disco > 85%, memoria > 90%
- Email de alerta a `familiacuevastavizon@gmail.com`

---

## EP-02 · Base de Datos & API Backend

> Esquema de datos, endpoints REST y autenticación.

### MUST HAVE

**EP-02-01 · Esquema de base de datos (migración inicial)**
```sql
-- Tabla: users
id           uuid PK
email        text unique
display_name text
api_key_hash text nullable   -- para autenticación de OpenClaw
created_at   timestamptz

-- Tabla: tickets
id           uuid PK
user_id      uuid FK → users
context      enum (TRABAJO | PERSONAL)
title        text
overview     text
what_to_do   text
next_steps   text[]
priority     enum (ALTA | MEDIA | BAJA)
status       enum (PENDIENTE | EN_PROGRESO | HECHO)
due_date     date nullable
raw_input    text
created_at   timestamptz
```
- Índices: `(user_id, context)`, `(user_id, status)`, `(user_id, due_date)`
- Script de migración versionado en `db/migrations/`

**EP-02-02 · Autenticación — Login web (email + password)**
- `POST /api/auth/login` → genera JWT (cookie httpOnly, httpOnly, SameSite=Strict)
- `POST /api/auth/logout` → invalida cookie
- Middleware que valida JWT en todas las rutas protegidas
- `userId` siempre extraído del JWT, nunca del body/query

**EP-02-03 · Autenticación — API Key para OpenClaw**
- `POST /api/auth/api-key` (autenticado vía JWT) → genera `ebdy_live_...`, guarda hash en DB
- Auth Middleware acepta `Authorization: Bearer ebdy_live_...` además de JWT
- Una sola API key por usuario en MVP

**EP-02-04 · Endpoint: Crear ticket**
- `POST /api/tickets`
- Acepta: `{ raw: string }` (texto crudo del usuario)
- Llama al Motor de IA (EP-05) → obtiene ticket clasificado
- Persiste en DB
- Retorna: ticket completo creado
- Validación: `raw` mínimo 1 carácter, máximo 2000

**EP-02-05 · Endpoint: Listar tickets**
- `GET /api/tickets?context=TRABAJO|PERSONAL&status=PENDIENTE`
- Filtros: `context`, `status`, `due_date`
- Cursor pagination (límite 20 por página)
- Retorna tickets del usuario autenticado únicamente

**EP-02-06 · Endpoint: Actualizar ticket**
- `PATCH /api/tickets/:id`
- Campos actualizables: `status`, `due_date`, `priority`
- Validación: el ticket debe pertenecer al usuario del JWT

**EP-02-07 · Endpoint: Health check**
- `GET /api/health` → `{ ok: true, timestamp: "..." }`
- Sin autenticación
- Verifica conectividad con DB

### SHOULD HAVE

**EP-02-08 · Manejo de errores — formato consistente**
- Todas las respuestas de error: `{ success: false, error: string, code: string }`
- Nunca exponer stack traces al cliente
- Códigos definidos: `AUTH_REQUIRED`, `TICKET_NOT_FOUND`, `AI_TIMEOUT`, `VALIDATION_ERROR`

**EP-02-09 · Logs estructurados**
- Formato JSON en stdout: `{ event, userId, ticketId, durationMs, endpoint }`
- Nunca loggear: API keys, tokens, texto completo del usuario

---

## EP-03 · Plataforma Web (Frontend)

> Interfaz de usuario para ver y gestionar tickets. Desktop-first.

### MUST HAVE

**EP-03-01 · Página de login**
- Formulario: email + contraseña
- Redirige a `/trabajo` si ya está autenticado
- Manejo de error: credenciales inválidas

**EP-03-02 · Layout dashboard con navegación**
- Sidebar o header con: Trabajo | Personal | Configuración
- Indicador de sesión activa (nombre del usuario)
- Botón de logout

**EP-03-03 · Vista Trabajo — lista de tickets**
- `GET /api/tickets?context=TRABAJO`
- Tarjeta por ticket: título, prioridad (color), estado, fecha límite
- Filtro rápido por estado (Pendiente / En Progreso / Hecho)
- Orden: prioridad ALTA primero, luego por fecha

**EP-03-04 · Vista Personal — lista de tickets**
- Igual que EP-03-03 pero `context=PERSONAL`
- Misma estructura visual, sección separada

**EP-03-05 · Detalle de ticket (modal o panel lateral)**
- Muestra: título, overview, qué hacer, pasos siguientes, prioridad, estado, fecha
- Botón para cambiar estado (PENDIENTE → EN_PROGRESO → HECHO)
- `PATCH /api/tickets/:id`

**EP-03-06 · Generación de API Key en Configuración**
- Página `/configuracion`
- Botón "Generar API Key para OpenClaw"
- Muestra la key UNA SOLA VEZ (copiar antes de cerrar)
- `POST /api/auth/api-key`

### SHOULD HAVE

**EP-03-07 · Estado vacío y estados de carga**
- Skeleton loader mientras carga la lista
- Estado vacío: "No tienes tickets de Trabajo todavía"
- Toast de éxito/error al actualizar estado

**EP-03-08 · Indicador de ticket nuevo (tiempo real)**
- Polling cada 30 segundos o WebSocket simple
- Badge en la sección cuando hay tickets nuevos desde el último acceso

---

## EP-04 · Integración OpenClaw + WhatsApp

> Todo lo necesario para que OpenClaw en el EliteMini reciba WhatsApp y cree tickets.

### MUST HAVE

**EP-04-01 · Adquirir número de WhatsApp dedicado**
- Comprar eSIM o SIM física barata (no el número personal de Martín)
- Alternativas: Google Voice (si disponible en MX), Twilio trial, SIM prepago
- Crear cuenta de WhatsApp con ese número
- **Criterio de aceptación:** número activo con WhatsApp instalado en un dispositivo secundario o eSIM

**EP-04-02 · Instalar OpenClaw en EliteMini**
- Instalar Node.js 24 en el EliteMini
- `npm install -g openclaw@latest`
- `openclaw onboard`: configurar proveedor LLM (Claude API), ingresar API key
- Verificar que el Gateway daemon inicia correctamente
- Configurar como servicio del sistema (`systemd`) para auto-inicio

**EP-04-03 · Conectar WhatsApp a OpenClaw (Baileys)**
- `openclaw channels add whatsapp`
- Escanear código QR con el número dedicado
- Verificar que OpenClaw recibe mensajes de prueba
- Documentar proceso de re-vinculación si la sesión expira

**EP-04-04 · Desarrollar ebuddy Skill**
- Crear skill personalizado: `ebuddy-skill/SKILL.md` + `ebuddy-skill/index.ts`
- Lógica del skill:
  1. Recibe texto del mensaje de Martín
  2. Llama `POST https://[dominio]/api/tickets` con `{ raw: texto }` + API Key
  3. Recibe el ticket creado
  4. Retorna mensaje de confirmación para que OpenClaw responda por WhatsApp
- Instalar skill en OpenClaw: `openclaw skills install ./ebuddy-skill`

**EP-04-05 · Configurar API Key en OpenClaw**
- Generar API Key desde la plataforma web (EP-03-06)
- Guardar en la configuración del ebuddy skill (`~/.openclaw/skills/ebuddy/config.json`)
- Verificar que el skill se autentica correctamente

**EP-04-06 · Prueba end-to-end del flujo completo**
- Martín manda mensaje de WhatsApp al número dedicado
- Ticket aparece en la plataforma web en la sección correcta (Trabajo o Personal)
- OpenClaw responde por WhatsApp con confirmación del ticket creado
- Tiempo total: < 10 segundos

### SHOULD HAVE

**EP-04-07 · Mensaje de confirmación enriquecido**
- Formato de respuesta de OpenClaw:
  > ✓ *[TRABAJO] "Título del ticket" · Prioridad ALTA · Vence viernes*
- Si hay error: respuesta clara indicando qué falló

**EP-04-08 · Manejo de sesión expirada de WhatsApp**
- Documentar pasos para re-escanear QR si la sesión cae
- Configurar notificación (email o log) cuando la sesión de WhatsApp se desconecta

---

## EP-05 · Motor de IA — Clasificación con Claude

> Integración con Claude API para entender y estructurar los tickets.

### MUST HAVE

**EP-05-01 · Integración Claude API**
- `lib/ai/claude.ts` — cliente Claude con `claude-sonnet-4-6`
- Timeout: 30 segundos (AbortController)
- Prompt en español con instrucciones de clasificación
- Output: JSON estricto `{ context, title, overview, what_to_do, next_steps, priority }`
- Validación del JSON de respuesta con Zod antes de persistir

**EP-05-02 · Prompt engineering — clasificación Trabajo / Personal**
- System prompt define:
  - Reglas de clasificación: qué es TRABAJO vs PERSONAL
  - Formato de output: JSON obligatorio, sin texto extra
  - Idioma: español siempre
  - Delimitadores para el input del usuario: `<user_input>...</user_input>`
- 3-5 ejemplos few-shot en español para consistencia
- Probar con 20 inputs reales de Martín antes de deploy

**EP-05-03 · Inferencia de fecha límite**
- Claude extrae fechas relativas del texto ("el viernes", "esta semana", "mañana")
- Las convierte a fecha absoluta usando la fecha actual como referencia
- `due_date: null` si no hay fecha mencionada

### SHOULD HAVE

**EP-05-04 · Manejo de errores de Claude API**
- Si Claude no responde en 30s: retorna `{ code: "AI_TIMEOUT" }`
- Si el JSON de Claude es inválido: retorna `{ code: "AI_PARSE_ERROR" }`
- Log del error con `durationMs` para diagnóstico

---

## Won't Have — Explícitamente fuera del MVP

| Feature | Razón |
|---|---|
| Integración Google Calendar | Fase 2 |
| Integración Gmail | Fase 2 |
| Integración LinkedIn | Fase 2 |
| Lectura de emails para crear tickets | Fase 2 |
| Vista de horizonte futuro (tickets sin fecha) | Fase 2 |
| OpenClaw responde preguntas (no solo crea tickets) | Fase 2 |
| Múltiples usuarios | Fuera de scope |
| App móvil | Fuera de scope |
| Modo offline | Fuera de scope |

---

## Orden de ejecución recomendado

```
Semana 1 — Infraestructura + Backend
  EP-01-01  Provisionar DO Managed PostgreSQL
  EP-01-02  Provisionar DO Droplet
  EP-02-01  Esquema de base de datos
  EP-02-02  Auth — Login web
  EP-02-04  Endpoint: Crear ticket
  EP-02-05  Endpoint: Listar tickets
  EP-05-01  Integración Claude API
  EP-05-02  Prompt engineering

Semana 2 — Frontend + API Key
  EP-03-01  Página de login
  EP-03-02  Layout dashboard
  EP-03-03  Vista Trabajo
  EP-03-04  Vista Personal
  EP-03-05  Detalle de ticket
  EP-02-03  Auth — API Key para OpenClaw
  EP-03-06  Generación de API Key en Configuración
  EP-01-03  CI/CD GitHub Actions
  EP-01-04  Dominio + HTTPS

Semana 3 — OpenClaw + WhatsApp + E2E
  EP-04-01  Adquirir número WhatsApp dedicado
  EP-04-02  Instalar OpenClaw en EliteMini
  EP-04-03  Conectar WhatsApp (Baileys)
  EP-04-04  Desarrollar ebuddy Skill
  EP-04-05  Configurar API Key en OpenClaw
  EP-04-06  Prueba end-to-end

Semana 4 — Should Haves + Estabilización
  EP-01-05  Docker Compose producción
  EP-02-08  Manejo de errores
  EP-02-09  Logs estructurados
  EP-03-07  Estados vacíos y carga
  EP-04-07  Confirmación enriquecida por WhatsApp
```

---

## Cómo importar este plan a Jira

**Opción A — Rovo (recomendado si tienes Atlassian):**
Copia el contenido de este documento y dile a Rovo:
> "Crea las epics y stories de este plan de trabajo en el proyecto [NOMBRE]. Usa los IDs como referencias entre tickets."

**Opción B — Importación CSV:**
Exportar a CSV con columnas: `Summary, Issue Type, Epic Link, Priority, Description`

**Opción C — Jira API:**
Automatizar la creación con `POST /rest/api/3/issue` usando este documento como fuente.
