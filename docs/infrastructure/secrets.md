# Gestión de Secrets — ebuddy

---

## Modelo de seguridad

```
Código fuente (git)        .env.local (local)          GitHub Actions Secrets
────────────────────       ──────────────────────       ──────────────────────────
Sin credenciales           Desarrollo local únicamente  Producción
.gitignore protege         Nunca en CI/CD               GitHub los cifra en reposo
                                                        Se inyectan via SSH al Droplet
                                                        como /opt/ebuddy/.env (chmod 600)
```

**No hay servicio de secrets manager externo.** Los secrets de runtime viven en `/opt/ebuddy/.env` dentro del Droplet.
GitHub Actions solo los sincroniza cuando se ejecuta manualmente el workflow `Operations`
con la tarea `sync-secrets`.

---

## Secrets mínimos en GitHub Actions

Ir a **GitHub → Settings → Secrets and variables → Actions → New repository secret** y agregar cada uno:

| Secret | Descripción |
|---|---|
| `DO_TOKEN` | Token de API de DigitalOcean (Terraform + deploy + sync manual) |
| `DO_SSH_PRIVATE_KEY` | Clave SSH privada para deploy (par de `ssh_pub_key` en tfvars) |
| `DO_SPACES_ACCESS_KEY` | Key de DO Spaces para backend remoto de Terraform |
| `DO_SPACES_SECRET_KEY` | Secret de DO Spaces para backend remoto de Terraform |

## Secrets de aplicación

Estos secrets ya **no son necesarios para el deploy normal**. Solo se usan si ejecutas
manualmente el workflow `Operations` con la tarea `sync-secrets` para escribir o rotar
`/opt/ebuddy/.env`:

| Secret | Descripción |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL |
| `AUTH_SECRET` | Secret de NextAuth/Auth.js |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key |
| `OPENAI_API_KEY` | OpenAI Whisper API Key |
| `RESEND_API_KEY` | API key de Resend |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://<domain>/api/auth/calendar/google/callback` |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth Client ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth Client Secret |
| `MICROSOFT_TENANT_ID` | `common` (o tenant ID específico) |
| `MICROSOFT_REDIRECT_URI` | `https://<domain>/api/auth/calendar/microsoft/callback` |

---

## Cómo se inyectan en producción

`deploy.yml` ya no toca secrets de runtime. El flujo queda así:

```
1. Push a main → build de imagen → push a DOCR
2. GitHub conecta por SSH al Droplet
3. Ejecuta /usr/local/bin/ebuddy-deploy
   → docker compose pull app
   → docker compose up -d
```

Cuando se necesite cargar o rotar secrets:

```
1. GitHub Actions → Run workflow → `Operations`
2. Elegir task = `sync-secrets`
3. El workflow conecta por SSH al Droplet
4. Sobreescribe /opt/ebuddy/.env con los valores actuales de GitHub Secrets
5. chmod 600 /opt/ebuddy/.env
```

El archivo `.env` nunca aparece en el repositorio ni en la imagen Docker.

---

## Variables de entorno de desarrollo local

Crear `.env.local` en la raíz del proyecto (está en `.gitignore`):

```bash
# Supabase (obtener en supabase.com → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# IA Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Google Calendar OAuth
GOOGLE_CLIENT_ID=XXXX.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/calendar/google/callback

# Microsoft Graph OAuth
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxx~xxxxxxxxxx
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/calendar/microsoft/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Rotación de secrets

### APIs externas (OpenAI, Anthropic)

1. Generar nueva clave en el dashboard del proveedor.
2. Actualizar el secret en GitHub Actions.
3. El siguiente push a `main` despliega el nuevo valor automáticamente.
4. O para rotar inmediatamente sin push: SSH al Droplet, editar `.env`, correr `ebuddy-deploy`.

### SSH Deploy Key

Si se sospecha compromiso:

1. Generar nuevo par: `ssh-keygen -t ed25519 -C "ebuddy-deploy-new"`
2. Actualizar `ssh_pub_key` en `terraform.tfvars` y correr `terraform apply` (actualiza la llave en DO).
3. Actualizar `DO_SSH_PRIVATE_KEY` en GitHub Actions secrets.
4. Revocar la llave vieja en DigitalOcean → Settings → Security → SSH Keys.

### Tokens OAuth de Google/Microsoft

Los access + refresh tokens de los calendarios se almacenan en la tabla `calendar_tokens` de Supabase (cifrados). El Calendar Service los renueva automáticamente.

Si el refresh token queda inválido (usuario revocó el acceso), el endpoint devuelve `CALENDAR_AUTH_REQUIRED` y el frontend redirige al flujo de re-autorización.

---

## Secrets de Terraform (DO Spaces)

El Terraform state se almacena en DO Spaces. Se necesitan **Spaces Access Keys** (distintas del DO token):

1. DigitalOcean → API → Spaces Keys → Generate New Key.
2. Exportar antes de cada `terraform init` / `apply`:
   ```bash
   export AWS_ACCESS_KEY_ID=<spaces_access_key>
   export AWS_SECRET_ACCESS_KEY=<spaces_secret_key>
   ```
3. Estas keys son solo para Terraform local — no se suben a GitHub.
