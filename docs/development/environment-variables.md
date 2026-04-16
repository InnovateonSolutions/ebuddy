# Variables de Entorno — Referencia Vigente

---

## Reglas

1. Variables `NEXT_PUBLIC_*` son visibles en el navegador.
2. El resto vive solo en servidor.
3. La referencia operativa debe mantenerse alineada con `.env.example` y `lib/env.ts`.
4. La URL pública vigente del deploy debe coincidir con `infra/config/main.env`.

---

## Variables requeridas

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `AUTH_SECRET` | Secreto de `next-auth` |
| `OPENAI_API_KEY` | API key de Whisper |
| `ANTHROPIC_API_KEY` | API key de Claude |

Estas cuatro son las que `lib/env.ts` valida en startup.

---

## Variables opcionales

### Email / magic links

| Variable | Descripción |
|---|---|
| `RESEND_API_KEY` | Habilita login por correo |
| `EMAIL_FROM` | Remitente de emails |

### App

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

### Google Calendar

| Variable | Descripción |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client id |
| `GOOGLE_CLIENT_SECRET` | OAuth secret |
| `GOOGLE_REDIRECT_URI` | Callback de Google |

### Microsoft Calendar

| Variable | Descripción |
|---|---|
| `MICROSOFT_CLIENT_ID` | Client id |
| `MICROSOFT_CLIENT_SECRET` | Client secret |
| `MICROSOFT_TENANT_ID` | Tenant id, default `common` |
| `MICROSOFT_REDIRECT_URI` | Callback de Microsoft |

### Infra local

| Variable | Descripción |
|---|---|
| `DO_TOKEN` | Terraform/apply local |
| `DO_SPACES_ACCESS_KEY` | Backend remoto de Terraform |
| `DO_SPACES_SECRET_KEY` | Backend remoto de Terraform |

---

## Plantilla base

La plantilla vigente es `.env.example`. Ejemplo resumido:

```bash
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
AUTH_SECRET=replace-me
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://ebuddy.innovateoncorp.com
```

---

## Notas de consistencia

- `AUTH_SECRET` reemplaza cualquier referencia vieja a `NEXTAUTH_SECRET`.
- El proyecto actual no usa variables de Supabase.
- Si agregas una variable nueva al runtime, actualiza al mismo tiempo:
  - `.env.example`
  - `lib/env.ts`
  - este documento
