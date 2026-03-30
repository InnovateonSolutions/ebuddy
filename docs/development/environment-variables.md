# Variables de Entorno — Referencia Completa

---

## Reglas

1. Variables con prefijo `NEXT_PUBLIC_` son visibles en el browser. Solo usarlas para valores seguros de exponer.
2. El resto de variables **solo están disponibles en el servidor** (API Routes, Middleware).
3. En AWS: inyectadas al container por ECS desde Secrets Manager en runtime.
4. En local: archivo `.env.local` (incluido en `.gitignore`).

---

## Variables requeridas

### Supabase

| Variable | Ejemplo | Segura en cliente | Descripción |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Sí | URL del proyecto Supabase. Diseñada para ser pública. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Sí | Anon key pública. RLS protege los datos. |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **No** | Service role — bypasea RLS. Solo server-side. |

### IA Providers

| Variable | Ejemplo | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | Whisper API — transcripción de voz |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude API — clasificación y estructuración de tickets |

### Google Calendar

| Variable | Ejemplo | Descripción |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `XXXX.apps.googleusercontent.com` | OAuth2 Client ID de Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | OAuth2 Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://app.ebuddy.io/api/auth/calendar/google/callback` | URI registrada en Google Cloud Console. Local: `http://localhost:3000/api/auth/calendar/google/callback` |

### Microsoft Graph (Outlook Calendar)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `MICROSOFT_CLIENT_ID` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Application ID en Azure AD |
| `MICROSOFT_CLIENT_SECRET` | `xxxxxxxxxx~xxxxxxxxxx` | Client secret generado en Azure AD |

### App

| Variable | Ejemplo | Descripción |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.ebuddy.io` | URL pública de la app. Usada para construir redirect URIs y links. Local: `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Secret para firmar cookies de sesión. Generar con `openssl rand -base64 32`. |

---

## Validación en startup

El archivo `lib/env.ts` valida que todas las variables server-side estén presentes cuando arranca el servidor. Si falta alguna, la app falla rápido con un mensaje claro:

```
Error: Missing env var: ANTHROPIC_API_KEY
```

Esto previene despliegues silenciosamente rotos.

---

## .env.example (template en el repo)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# IA Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Google Calendar OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/calendar/google/callback

# Microsoft Graph OAuth
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxx~xxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-openssl-rand-base64-32
```

---

## Cómo obtener cada variable

### Supabase
1. Ir a [supabase.com](https://supabase.com) → tu proyecto → **Settings → API**
2. `URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**nunca** exponerla en el cliente)

### OpenAI (Whisper)
1. [platform.openai.com](https://platform.openai.com) → **API Keys → Create new secret key**

### Anthropic (Claude)
1. [console.anthropic.com](https://console.anthropic.com) → **API Keys → Create Key**

### Google Calendar
1. [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → Habilitar **Google Calendar API**
3. **Credenciales → Crear credenciales → ID de cliente OAuth 2.0**
4. Tipo: **Aplicación web**
5. Agregar URI de redireccionamiento autorizado: `https://app.ebuddy.io/api/auth/calendar/google/callback` (y `http://localhost:3000/...` para dev)

### Microsoft Graph
1. [portal.azure.com](https://portal.azure.com) → **Azure Active Directory → Registros de aplicaciones → Nuevo registro**
2. URI de redireccionamiento: `https://app.ebuddy.io/api/auth/calendar/microsoft/callback`
3. **Certificados y secretos → Nuevo secreto de cliente**
4. **Permisos de API → Microsoft Graph → Calendars.Read** (permiso delegado)
