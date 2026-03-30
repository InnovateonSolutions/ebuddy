# ADR 005 — OpenClaw en Mini PC (Homelab) como cliente de ebuddy

**Estado:** Aceptado — pendiente de implementación (mini PC llega 19 de abril 2026)
**Fecha:** Marzo 2026
**Autor:** Martín Cuevas Tavizón

---

## Contexto

ebuddy captura tickets via interfaz web (voz o texto). El usuario quiere capturar tickets desde **apps de mensajería** (WhatsApp, Telegram, iMessage) sin abrir el navegador.

Simultáneamente, el usuario adquirió un **MINISFORUM UM890 Pro** (Ryzen 9 8945HS, 8C/16T) que estará disponible el 19 de abril de 2026 y que puede correr software de forma continua en casa.

**OpenClaw** es un asistente de IA local (open-source) que se integra con 50+ apps de mensajería y puede ejecutar "skills" personalizados para llamar APIs externas.

---

## Opciones evaluadas

### Opción A — OpenClaw en DigitalOcean Droplet (descartada)

Instalar OpenClaw en el mismo Droplet donde corre ebuddy.

**Problemas:**
- WhatsApp Web requiere vinculación con teléfono físico y sesión de browser. En un servidor remoto la sesión se cae constantemente.
- iMessage es exclusivo de macOS/hardware Apple. Imposible en Linux de servidor.
- OpenClaw está diseñado para actuar sobre la máquina local del usuario (archivos, browser). En un Droplet remoto esas capacidades no tienen sentido.

**Veredicto:** Descartada.

### Opción B — OpenClaw en Mini PC local → ebuddy en Droplet (elegida)

OpenClaw corre en el mini PC en casa. ebuddy sigue en el Droplet de DigitalOcean.
OpenClaw llama a la API de ebuddy via HTTPS.

**Ventajas:**
- WhatsApp e iMessage funcionan correctamente (el mini PC es una máquina local con acceso al teléfono/Mac ecosystem).
- ebuddy sigue disponible 24/7 desde cualquier dispositivo (no depende de que el mini PC esté encendido).
- El mini PC (8C/16T, hasta 96 GB RAM) puede correr modelos de IA locales en el futuro para reducir costos de API.
- Separación clara de responsabilidades: mensajería/automatización local ↔ app web siempre disponible.

**Veredicto:** Elegida.

### Opción C — Todo en Mini PC (sin Droplet)

ebuddy + OpenClaw + Supabase self-hosted en el mini PC.

**Problemas:**
- Si el mini PC se apaga, se reinicia o hay un corte de luz, ebuddy deja de estar disponible.
- Requiere Cloudflare Tunnel para acceso externo (complejidad adicional).
- El free tier de Supabase Cloud cubre el MVP sin costo. Self-hosting añade mantenimiento.

**Veredicto:** Viable en Fase 2 si se quiere costo $0/mes, pero no para MVP.

---

## Decisión

**OpenClaw en Mini PC + ebuddy en Droplet de DigitalOcean.**

```
MINISFORUM UM890 Pro (local, siempre encendido)
└── OpenClaw
    ├── WhatsApp
    ├── Telegram
    ├── iMessage (si se conecta con Mac)
    └── skill: ebuddy
            │ HTTPS POST /api/tickets/capture
            ▼
    DigitalOcean Droplet
    └── ebuddy (Next.js + Caddy + Supabase Cloud)
```

---

## Cambios requeridos en ebuddy

### 1. Endpoint de API Key (`POST /api/auth/api-key`)

OpenClaw necesita un token de larga duración para autenticarse sin pasar por el flujo OAuth de Supabase.

```typescript
// Genera un token estático para uso en integraciones externas (OpenClaw, bots, etc.)
// Solo accesible para el usuario autenticado
POST /api/auth/api-key
→ { apiKey: "ebdy_live_..." }
```

La API key se almacena hasheada en `user_preferences` y se valida en el Auth Middleware.

### 2. Skill de OpenClaw (`ebuddy-skill`)

Un skill en ClawHub (o local) que:
- Recibe texto/transcripción del mensaje del usuario
- Llama `POST /api/tickets/capture` con el texto y el API key en el header
- Responde con el título del ticket creado

---

## Hardware del Mini PC

| Atributo | Valor |
|---|---|
| Modelo | MINISFORUM UM890 Pro |
| CPU | AMD Ryzen 9 8945HS (8C/16T, hasta 5.2 GHz) |
| GPU integrada | AMD Radeon 780M (capacidad para modelos locales) |
| NPU | AMD XDNA (aceleración de IA local) |
| Ethernet | 2x RJ45 (dual NIC — ideal para servidor doméstico) |
| Versión | Barebone (sin RAM ni storage — agregar DDR5 + NVMe) |
| Llegada estimada | 19 de abril de 2026 |

**RAM recomendada para el uso previsto:** 32 GB DDR5 (correr OpenClaw + modelos IA locales en el futuro).

---

## Consecuencias

**Positivas:**
- Captura de tickets desde WhatsApp/Telegram/iMessage sin abrir el navegador.
- ebuddy sigue disponible desde cualquier dispositivo (no depende del mini PC).
- El mini PC puede crecer: modelos IA locales, Supabase self-hosted, más integraciones.
- Costo de mensajería: $0 (OpenClaw open-source + mini PC ya adquirido).

**Negativas / Riesgos aceptados:**
- Si el mini PC se apaga, las integraciones de mensajería dejan de funcionar (ebuddy web sigue disponible).
- La API key de larga duración es un secreto adicional que gestionar.
- Implementación pendiente hasta la llegada del mini PC (19 de abril de 2026).

## Criterio de revisión

Cuando haya más de 1 usuario usando ebuddy, evaluar mover la lógica de integración de mensajería a un servicio independiente (bot de Telegram en el Droplet) para no depender del mini PC de Martín.
