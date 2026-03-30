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

**No hay servicio de secrets manager externo.** Los secrets de producción viven como GitHub Actions secrets y se escriben en el Droplet en cada deploy.

---

## Carga inicial de secrets en GitHub Actions

Ir a **GitHub → Settings → Secrets and variables → Actions → New repository secret** y agregar cada uno:

| Secret | Descripción |
|---|---|
| `DO_TOKEN` | Token de API de DigitalOcean (también para Terraform) |
| `DO_REGISTRY_NAME` | Nombre del registry DOCR (ej: `ebuddy-prod`) |
| `DO_DROPLET_IP` | IP reservada del Droplet (output de `terraform output droplet_ip`) |
| `DO_SSH_PRIVATE_KEY` | Clave SSH privada para deploy (par de `ssh_pub_key` en tfvars) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (pública por diseño) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (solo server-side) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key |
| `OPENAI_API_KEY` | OpenAI Whisper API Key |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://<domain>/api/auth/calendar/google/callback` |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth Client ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth Client Secret |
| `MICROSOFT_TENANT_ID` | `common` (o tenant ID específico) |
| `MICROSOFT_REDIRECT_URI` | `https://<domain>/api/auth/calendar/microsoft/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://<domain>` |

---

## Cómo se inyectan en producción

Cada push a `main` → GitHub Actions:

```
1. Conecta al Droplet via SSH (DO_SSH_PRIVATE_KEY + DO_DROPLET_IP)
2. Sobreescribe /opt/ebuddy/.env con los valores de los secrets
3. chmod 600 /opt/ebuddy/.env  (solo root puede leerlo)
4. Ejecuta /usr/local/bin/ebuddy-deploy
   → docker compose pull app
   → docker compose up -d
```

El archivo `.env` **nunca aparece en logs, en el repositorio, ni en la imagen Docker**.

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
