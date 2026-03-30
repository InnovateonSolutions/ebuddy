# Integración OpenClaw — ebuddy

> **Estado:** Pendiente de implementación — requiere mini PC (llega 19 de abril 2026)
> Ver [ADR 005](../architecture/adr/005-openclaw-homelab.md) para el razonamiento de la decisión.

---

## Qué habilita esta integración

Capturar tickets en ebuddy desde cualquier app de mensajería soportada por OpenClaw:
- WhatsApp
- Telegram
- iMessage (si el mini PC está conectado al ecosistema Apple)
- Discord, Slack, Signal, y 45+ más

**Flujo:**

```
"Necesito preparar propuesta para cliente X antes del viernes"
        │
        ▼ (WhatsApp / Telegram / iMessage)
  OpenClaw (Mini PC)
        │ POST /api/tickets/capture
        │ Authorization: Bearer ebdy_live_...
        ▼
  ebuddy API (Droplet)
        │ Claude clasifica + estructura
        ▼
  Ticket creado → aparece en vista del día
```

---

## Cambios requeridos en ebuddy

### 1. Columna `api_key` en `user_preferences`

```sql
-- Migración: supabase/migrations/003_api_keys.sql
ALTER TABLE user_preferences
  ADD COLUMN api_key_hash text,
  ADD COLUMN api_key_prefix text;  -- ej: "ebdy_live_AbCd" (para identificar sin exponer)
```

### 2. Endpoint `POST /api/auth/api-key`

```typescript
// app/api/auth/api-key/route.ts
// Genera una API key de larga duración para integraciones externas
// Requiere JWT válido (el usuario debe estar autenticado en la web)

POST /api/auth/api-key
Authorization: Bearer <supabase_jwt>

Response:
{
  "success": true,
  "data": {
    "apiKey": "ebdy_live_<random_32_chars>",  // mostrar UNA SOLA VEZ
    "prefix": "ebdy_live_AbCd"                // para identificar la key después
  }
}
```

La key se almacena **hasheada** (bcrypt o SHA-256) — si se pierde, el usuario genera una nueva.

### 3. Validación de API Key en Auth Middleware

```typescript
// middleware.ts — agregar soporte para API key además de JWT
// Header: Authorization: Bearer ebdy_live_...
// Si empieza con "ebdy_live_", validar contra el hash en DB
// Si no, tratar como JWT de Supabase (flujo actual)
```

### 4. Endpoint `GET /api/tickets/summary` (nuevo, para OpenClaw)

Permite preguntarle a OpenClaw "¿qué tengo pendiente?" y que responda con el resumen del día.

```typescript
GET /api/tickets/summary
Authorization: Bearer ebdy_live_...

Response:
{
  "success": true,
  "data": {
    "pending": 3,
    "in_progress": 1,
    "today": [...],    // tickets del día resumidos
    "overdue": [...]
  }
}
```

---

## Skill de OpenClaw

> Archivo a crear en el mini PC cuando llegue. Ver [docs/infrastructure/homelab.md](../infrastructure/homelab.md) para el setup del mini PC.

### Estructura del skill

```
ebuddy-skill/
├── skill.json       # metadata del skill
├── index.js         # lógica principal
└── README.md
```

### `skill.json`

```json
{
  "name": "ebuddy",
  "description": "Crea y consulta tickets en ebuddy desde cualquier app de mensajería",
  "version": "1.0.0",
  "triggers": [
    "crear ticket",
    "agregar tarea",
    "recordarme",
    "qué tengo pendiente",
    "plan del día"
  ],
  "config": {
    "EBUDDY_API_URL": {
      "description": "URL de tu instancia de ebuddy",
      "example": "https://app.ebuddy.io"
    },
    "EBUDDY_API_KEY": {
      "description": "API key generada en ebuddy → Settings → Integraciones",
      "sensitive": true
    }
  }
}
```

### `index.js` (lógica del skill)

```javascript
const EBUDDY_API_URL = process.env.EBUDDY_API_URL
const EBUDDY_API_KEY = process.env.EBUDDY_API_KEY

async function captureTicket(text) {
  const res = await fetch(`${EBUDDY_API_URL}/api/tickets/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${EBUDDY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
  const { data } = await res.json()
  return `Ticket creado: "${data.title}" (${data.priority} · ${data.context})`
}

async function getDaySummary() {
  const res = await fetch(`${EBUDDY_API_URL}/api/tickets/summary`, {
    headers: { 'Authorization': `Bearer ${EBUDDY_API_KEY}` },
  })
  const { data } = await res.json()
  const lines = data.today.map(t => `• [${t.priority}] ${t.title}`)
  return `Plan del día (${data.today.length} tickets):\n${lines.join('\n')}`
}

module.exports = { captureTicket, getDaySummary }
```

---

## Configuración en el Mini PC

Una vez instalado OpenClaw en el mini PC (ver [homelab.md](../infrastructure/homelab.md)):

```bash
# 1. Generar API key en ebuddy
# → abrir ebuddy en el browser → Settings → Integraciones → Generar API key
# → copiar "ebdy_live_..."

# 2. Configurar el skill en OpenClaw
openclaw skill install ./ebuddy-skill
openclaw skill config ebuddy EBUDDY_API_URL https://app.ebuddy.io
openclaw skill config ebuddy EBUDDY_API_KEY ebdy_live_...

# 3. Probar
openclaw test "crear ticket: revisar propuesta del cliente Acme"
# → "Ticket creado: 'Revisar propuesta cliente Acme' (ALTA · NEGOCIO)"
```

---

## Backlog de implementación

Ordenado por prioridad:

| # | Tarea | Estimado |
|---|---|---|
| 1 | Migración SQL `003_api_keys.sql` | 15 min |
| 2 | Endpoint `POST /api/auth/api-key` | 1h |
| 3 | Validación API key en middleware | 1h |
| 4 | Endpoint `GET /api/tickets/summary` | 30 min |
| 5 | UI en Settings para generar/revocar API key | 1h |
| 6 | Instalar OpenClaw en mini PC | 30 min (cuando llegue el 19 de abril) |
| 7 | Escribir y configurar skill de ebuddy | 1h |
| 8 | Pruebas end-to-end desde WhatsApp/Telegram | 30 min |
