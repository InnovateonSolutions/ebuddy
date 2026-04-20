# ebuddy — Guía para Agentes de IA

Este documento define los lineamientos de desarrollo para cualquier agente de IA
(Claude, GPT, Gemini, etc.) que trabaje en este repositorio. Léelo antes de hacer
cualquier cambio.

---

## Pipeline de desarrollo obligatorio

Cuando el usuario diga **"desarrolla [X]"**, **"implementa [X]"** o equivalentes,
ejecutar estos pasos en orden sin saltarse ninguno:

### 1. Crear ticket en Jira

Usar el script canónico (requiere variables `JIRA_*` en entorno — ver sección
[Entorno local para Jira](#entorno-local-para-jira)):

```bash
./scripts/jira/create-issue.sh \
  --title "Implementar X para Y" \
  --problem "Qué problema se resuelve" \
  --acceptance "Qué debe quedar funcionando" \
  --notes "Notas técnicas" \
  --type Task \
  --priority "Must Have" \
  --labels backend,infra
```

- **Proyecto:** KAN (`https://innovateonsolutions.atlassian.net`)
- `--type`: `Story` / `Task` / `Bug`
- `--priority`: `Must Have` / `Should Have` / `Could Have` / `Won't Have`
- `--labels`: uno o más de `frontend`, `backend`, `infra`, `ux`, `test`, `docs`

### 2. Leer documentación antes de asumir

- Antes de usar cualquier CLI, librería o API: leer su `--help` o documentación oficial
- No asumir flags, comportamiento por defecto ni formatos de salida
- Este paso evitó 8+ commits de fix en sesiones anteriores

### 3. Escribir tests en ROJO primero (TDD estricto)

- **Escribir los tests ANTES de implementar**
- Verificar que los tests fallan contra el código actual
- Commitear los tests fallando si la tarea es grande
- Tests estructurales (pytest): `scripts/tests/`
- Tests de lógica de negocio: Vitest en TypeScript
- El test debe cubrir el **comportamiento real** (incluyendo flags específicos, no solo
  que un comando existe)

### 4. Implementar hasta GREEN

- Solo lo que pide el ticket — sin features extra, sin refactoring no solicitado
- Sin docstrings, comentarios o type annotations en código no modificado
- Sin manejo de errores para escenarios imposibles
- Sin abstracciones prematuras

### 5. Auditoría de cumplimiento

Antes de commitear, verificar:

```bash
# Tests estructurales
python3 -m pytest scripts/tests/ -v

# Typecheck TypeScript
npx tsc --noEmit

# Tests unitarios (si aplica)
npm run test:run
```

- Sin regresiones en la suite completa
- Sin vulnerabilidades introducidas (XSS, SQL injection, etc.)
- Sin scope creep respecto al ticket original
- **Si el ticket toca páginas del dashboard:** agregar un test estructural que verifique que la página importa `export const dynamic = 'force-dynamic'` y que no llama a columnas de DB que no existan en el schema actual

### 6. Commit y push

```bash
git add <archivos específicos>  # NUNCA git add -A sin revisar
git commit -m "tipo: descripción corta

Detalle del por qué (no del qué).

Co-Authored-By: <nombre del agente>"
git push
```

Convención de commits:
- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `test:` solo tests
- `chore:` mantenimiento (deps, config)
- `refactor:` reestructuración sin cambio de comportamiento

### 7. Esperar que el pipeline CI/CD pase

- Verificar el resultado en GitHub Actions — **SIEMPRE revisar CI y Deploy, no solo CI**
- **NO cerrar el ticket hasta que CI y Deploy estén en verde**
- Si falla: diagnosticar leyendo los logs del workflow antes de asumir la causa

```bash
gh run list --limit 5                        # ver estado de CI y Deploy
gh run view <run_id> --log-failed            # logs del job fallido
gh run view <run_id> --log | grep -E "(error|Error|failed|FAILED)" | head -20
```

**Edge cases críticos a revisar en cada deploy:**
- El job **Build & Push** puede fallar silenciosamente si `continue-on-error: true` y el retry también falla
- La migración (`Run migrations on Droplet`) solo corre cuando `migrator_changed == 'true'`. Si un build anterior falló y una migración quedó sin correr, la app se rompe en runtime aunque el build actual sea exitoso. En ese caso: `gh workflow run deploy.yml --ref main` para forzar re-deploy con migración
- **El `drizzle/meta/_journal.json` debe tener una entrada por cada archivo `.sql` en `drizzle/`** — si falta una entrada, Drizzle ignora silenciosamente esa migración aunque el archivo exista. Verificar con: `ls drizzle/*.sql | wc -l` vs `cat drizzle/meta/_journal.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['entries']))"`. Si hay discrepancia, añadir las entradas faltantes al journal antes de hacer deploy.
- **Las migraciones pueden registrarse como "aplicadas" en `__drizzle_migrations` sin haber ejecutado el SQL** — si la app arroja `column "X" does not exist` en producción, verificar columnas con `SELECT column_name FROM information_schema.columns WHERE table_name='<tabla>'` vía psql en el Droplet y aplicar `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` manualmente si falta
- El job **Deploy** puede pasar aunque la app esté en error — siempre verificar que los E2E smoke tests pasen también
- Si se agrega una nueva variable de entorno al código, debe añadirse también en el step **"Write .env on Droplet"** del `deploy.yml`, de lo contrario la app corre sin ella en producción

**Diagnóstico rápido de errores de producción:**
```bash
# Ver logs del contenedor en el Droplet (acceso vía diagnose.yml o SSH)
docker logs $(docker ps --format "{{.Names}}" | grep -v caddy | head -1) --tail 80

# Verificar columnas de una tabla en producción
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='user_preferences';"
```

### 8. Cerrar ticket en Jira

Solo cuando el CI/CD esté en verde:

```bash
./scripts/jira/close-issue.sh KAN-XX
```

El script resuelve automáticamente el ID de la transición "Done" y la aplica.
Para usar otro estado de cierre: `./scripts/jira/close-issue.sh KAN-XX "In Review"`

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) · React · Tailwind CSS · shadcn/ui |
| Backend | Next.js API Routes · Node.js |
| Base de datos | PostgreSQL (DO Managed DB) · Drizzle ORM |
| Autenticación | next-auth v5 · JWT |
| Transcripción | OpenAI Whisper API |
| IA | Anthropic Claude API (claude-sonnet-4-6 o superior) |
| Calendarios | Google Calendar API v3 · Microsoft Graph API |
| Contenedores | Docker multi-stage |
| Registry | DigitalOcean Container Registry (DOCR) |
| Deploy | DigitalOcean Droplet · GitHub Actions · Terraform |
| Infra | Terraform (estado en DO Spaces) |
| Tests estructurales | Python pytest (`scripts/tests/`) |
| Tests unitarios | Vitest |

---

## Organización de módulos compartidos (`lib/`)

Toda la lógica reutilizable vive en `lib/`. Las rutas y páginas deben ser delgadas
y delegar a estos módulos. **No recrear archivos en `types/` ni `hooks/`.**
Todo helper reutilizable nuevo vive en `lib/`.
Si aparece una excepción nueva, primero se actualiza `AGENTS.md` y luego se implementa el cambio en el código.

| Módulo | Responsabilidad |
|---|---|
| `lib/types.ts` | Tipos y contratos públicos compartidos (re-exporta desde schema + tipos propios) |
| `lib/tickets.ts` | Queries y helpers de tickets: `getTodayTickets`, `getFutureTickets`, `getUserTimezone` |
| `lib/calendar.ts` | Carga unificada de eventos de calendario (Google + Microsoft) |
| `lib/capture.ts` | Lógica de captura: transcripción Whisper, parsing Claude, persistencia — usado por el route handler |
| `lib/ticket-client.ts` | Mutaciones cliente (`updateTicket`, `deleteTicket`) — llamadas fetch desde componentes |
| `lib/ticket-ui.ts` | Constantes y helpers visuales: `STATUS_CYCLE`, `getNextTicketStatus`, `formatTicketDate` |
| `lib/utils.ts` | Utilidades genéricas: `todayInTimezone`, `cn`, `logEvent` |
| `lib/ai/` | Servicios de IA: `WhisperTranscriptionService`, `ClaudeAIService` |
| `lib/calendar/google.ts` | Integración Google Calendar API v3 (no importar directamente desde rutas) |
| `lib/calendar/microsoft.ts` | Integración Microsoft Graph API (no importar directamente desde rutas) |
| `lib/db/` | Drizzle ORM: `db`, schema, migraciones |

---

## Reglas críticas de arquitectura

1. **El frontend nunca llama a APIs externas directamente** — todo vía API Routes
2. **`userId` nunca viene del cliente** — siempre del JWT validado por middleware
3. **El audio nunca se persiste** — procesar y descartar inmediatamente
4. **Aislamiento por `userId` en cada query** — el middleware de next-auth valida la sesión; el `userId` se extrae del JWT y se aplica como filtro explícito en cada query de Drizzle. No se usa RLS nativo de PostgreSQL (no está disponible en DO Managed DB sin Supabase)
5. **Sin `any` explícito en TypeScript** — `strict: true` en tsconfig

---

## Reglas anti-drift de UX y producto

Estas reglas existen para evitar que la implementación se vuelva a alejar de la experiencia y organización definidas por el repo.

1. **Las rutas autenticadas comparten un único patrón de navegación** — no se crean navbars o layouts paralelos para superficies privadas equivalentes
2. **No mezclar `PublicNav` dentro de rutas protegidas** — la navegación pública y la autenticada deben permanecer separadas
3. **La landing, login, status y settings deben describir el mismo estado real del producto** — si cambia el runtime, se actualiza el copy visible en todas esas superficies dentro del mismo ticket
4. **Eliminar mensajes legacy de "despliegue inicial"** cuando ya no describan el estado real del producto o del entorno
5. **Todo texto visible al usuario debe mantener el mismo idioma base por superficie** — si una vista está en español, labels, estados, CTAs y mensajes auxiliares también permanecen en español salvo nombres propios
6. **No introducir labels de estados en inglés si la UI de esa vista está en español**

Si una nueva feature necesita romper una de estas reglas, el ticket debe incluir la excepción explícita y `AGENTS.md` se actualiza en el mismo cambio para evitar una segunda convención implícita.

---

## Estándares de UI/UX obligatorios

### Patrones de navegación
- **Top nav (≥ sm)** + **bottom nav fija (< sm)**: patrón obligatorio en todas las rutas autenticadas del dashboard — no reemplazar por hamburger menu
- **Dropdown de perfil**: al hacer clic en el avatar → Ajustes + Salir; nunca botón "Salir" inline
- **Sticky top bar**: `sticky top-0 z-20` en el nav principal para mantener contexto en scroll

### Patrones de layout
- **Dashboard layout**: `max-w-5xl mx-auto px-4` para contenido principal; `max-w-2xl` para páginas de formulario/detalle
- **Cards de métricas**: `grid grid-cols-2 sm:grid-cols-4` — nunca 4 columnas en mobile
- **Secciones de configuración**: `divide-y` dentro de `bg-white rounded-2xl border` — sin tablas
- **Empty states**: siempre incluir un mensaje amigable + descripción cuando no hay contenido; usar el componente `ComingSoon` para secciones no implementadas

### Patrones de UX
- **Feedback inmediato**: loaders visibles (`animate-spin`) en operaciones async; mensajes de éxito/error en el mismo lugar que el formulario
- **Estados vacíos**: nunca dejar una lista en blanco sin mensaje explicativo
- **Confirmación de acciones destructivas**: modal o dropdown antes de eliminar/archivar

### Responsivo móvil (mobile-first obligatorio)
- **Touch targets mínimos**: botones e inputs deben tener `py-2` mínimo (≥ 44px de altura); nunca `py-1` en elementos interactivos
- **Filas de formulario**: `flex flex-col sm:flex-row` para que info + botón se apilen verticalmente en móvil
- **Grids**: siempre definir el breakpoint móvil explícito — e.g. `grid-cols-1 sm:grid-cols-2`, nunca `grid-cols-2` sin breakpoint si las celdas son anchas
- **Texto truncado**: usar `truncate` o `line-clamp-X` en texto dinámico dentro de contenedores de ancho fijo
- **Padding inferior en layout**: `pb-24 sm:pb-6` en `<main>` del dashboard para dejar espacio a la bottom nav

### Iconografía
- Lucide React — única librería de íconos autorizada
- Tamaño estándar: `size={16}` en listas, `size={20}` en bottom nav, `size={24}` en heroes/CTAs

---

## Autenticación DOCR en GitHub Actions

**Método correcto** — escribir inline base64 a `~/.docker/config.json`:

```yaml
- name: Configure DOCR credentials
  env:
    DO_TOKEN: ${{ secrets.DO_TOKEN }}
  run: |
    mkdir -p ~/.docker
    AUTH="$(printf 'docr:%s' "${DO_TOKEN}" | base64 -w 0)"
    printf '{"auths":{"registry.digitalocean.com":{"auth":"%s"}}}\n' "${AUTH}" \
      > ~/.docker/config.json
```

**Nunca usar:**
- `docker/login-action` — usa credential store inaccesible desde buildkitd
- `doctl registry login` — configura credential helper que buildkitd no puede ejecutar
- `doctl registry docker-config` — genera tokens derivados rechazados intermitentemente
- `DOCKER_CONFIG=/tmp/docker-config` — buildkitd (docker-container driver) monta `~/.docker` del host, NO respeta `$DOCKER_CONFIG`

Este step debe ejecutarse **antes** de `docker/setup-buildx-action`.

**Wait for GC — patrón correcto:**
DOCR GC tiene múltiples estados activos (`"waiting for write JWTs to expire"`, `"scanning manifests"`, etc.).
Nunca grep por estado activo — grep por estados TERMINALES e invertir:
```bash
GC_STATUS="$(doctl registry garbage-collection list "$REGISTRY" --no-header | head -1)"
[ -z "$GC_STATUS" ] || echo "$GC_STATUS" | grep -qE "(succeeded|failed|cancelled)"
```

---

## Migraciones de DB en CI/CD

**DO Managed DB solo acepta conexiones del Droplet** (firewall: `type=droplet`). Los runners de GitHub Actions tienen IPs dinámicas → timeout de 30s → exit 1.

**Solución**: correr migraciones desde el Droplet vía SSH en el job `deploy`.

Arquitectura:
1. `Dockerfile` tiene stage `migrator` con drizzle-kit + archivos de migración
2. Build job empuja `registry.digitalocean.com/ebuddy-dev/ebuddy:migrator`
3. Deploy job SSH escribe `/opt/ebuddy/.env` y corre el contenedor migrador:

```bash
docker pull registry.digitalocean.com/ebuddy-dev/ebuddy:migrator
docker run --rm --env-file /opt/ebuddy/.env \
  registry.digitalocean.com/ebuddy-dev/ebuddy:migrator
```

**No hay job `migrate` separado** — fue eliminado porque los runners de CI no tienen acceso a la DB.

---

## Escritura de `/opt/ebuddy/.env` en el Droplet

El cloud-init crea un `.env` placeholder. GitHub Actions lo sobreescribe en cada deploy:

```yaml
- uses: appleboy/ssh-action@v1
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    # ... otros secrets
  with:
    envs: DATABASE_URL,AUTH_SECRET,...
    script: |
      env | grep -E '^(DATABASE_URL|AUTH_SECRET|...)=' > /opt/ebuddy/.env
      echo "NODE_ENV=production" >> /opt/ebuddy/.env
      chmod 600 /opt/ebuddy/.env
```

`env | grep` preserva formato `KEY=VALUE` sin riesgo de shell injection en valores.

---

## Estructura de tests estructurales

Los tests en `scripts/tests/` protegen invariantes del proyecto.
`conftest.py` provee fixtures compartidos (p. ej. `load_script` para importar scripts Python como módulos).

| Archivo | Qué protege |
|---|---|
| `test_workflow_triggers.py` | CI/CD: triggers, permisos, orden de steps |
| `test_kanban.py` | Kanban board: auth, DnD, API |
| `test_visit_counter.py` | VisitCounter: PUBLIC_PATHS, guard de tipo |
| `test_api_key.py` | Generación y validación de API keys |
| `test_db_init.py` | Schema SQL inicial |
| `test_render_env.py` | Script de generación de .env en el Droplet |
| `test_get_droplet_ip.py` | Script `get-droplet-ip.py`: obtención de IP pública vía DO API |
| `test_docs_sources_of_truth.py` | Documentación: fuente de verdad única, sin referencias a stacks removidos |
| `test_code_organization.py` | Módulos `lib/`: existencia, importaciones correctas, wrappers muertos eliminados |
| `test_jira_scripts.py` | Scripts `scripts/jira/`: existencia, vars de entorno, campos del pipeline |
| `test_operational_pruning.py` | Scripts operativos (Dockerfile, deploy.sh, bootstrap.sh): sin referencias a Supabase |

---

## Flujo TDD paso a paso

```
1. Entender el requerimiento
2. Leer docs de herramientas/APIs involucradas
3. Escribir test en ROJO → pytest o vitest confirma que falla
4. Implementar el mínimo para que pase
5. pytest/vitest confirma GREEN
6. Refactorizar si es necesario (sin romper tests)
7. Suite completa pasa
8. Commit
```

---

## Entorno local para Jira

Las variables de integración con Jira se gestionan vía `direnv` y `.envrc` (nunca
se versionan — `.envrc` está en `.gitignore`).

```bash
# Copiar plantilla y completar con valores reales
cp .envrc.example .envrc
# editar .envrc con los valores de tu cuenta Jira

# Habilitar direnv (carga automáticamente al entrar al directorio)
direnv allow
```

Variables requeridas (definidas en `.envrc.example`):

| Variable | Valor |
|---|---|
| `JIRA_BASE_URL` | `https://innovateonsolutions.atlassian.net` |
| `JIRA_PROJECT_KEY` | `KAN` |
| `JIRA_EMAIL` | Tu cuenta técnica de Jira |
| `JIRA_TOKEN` | API token de Atlassian (`id.atlassian.com → Security → API tokens`) |

---

## Archivos eliminados intencionalmente

Estos archivos **no deben recrearse**. Fueron eliminados como parte de la
consolidación del stack y la organización por dominio:

| Archivo eliminado | Razón | Reemplazado por |
|---|---|---|
| `types/api.ts` | Tipos dispersos sin dueño claro | `lib/types.ts` |
| `types/database.ts` | Duplicación del schema de Drizzle | `lib/types.ts` + `lib/db/schema` |
| `hooks/use-realtime-tickets.ts` | Abstracción vacía (sin realtime real) | fetch directo en componentes |
| `components/calendar-event-item.tsx` | Solo se usaba en `day-view.tsx` | Renderer inline en `day-view.tsx` |
| `components/logout-button.tsx` | Solo se usaba en el layout | Botón inline en `app/(dashboard)/layout.tsx` |
| `CLAUDE.md` | Segunda fuente de verdad | `AGENTS.md` (este archivo) |
| `docs/architecture/adr/002-supabase-baas.md` | Stack removido | — |
| `docs/architecture/adr/004-ecs-fargate.md` | Infraestructura no utilizada | — |
| `docs/architecture/adr/005-openclaw-homelab.md` | Reemplazado por sección OpenClaw en AGENTS.md | AGENTS.md |
| `docs/integrations/openclaw.md` | Reemplazado por sección OpenClaw en AGENTS.md | AGENTS.md |
| `docs/infrastructure/homelab.md` | Reemplazado por sección OpenClaw en AGENTS.md | AGENTS.md |
| `docs/plan-trabajo-mvp.md` | Plan ejecutado; estado real en Jira | — |

---

## OpenClaw — Integración de mensajería

OpenClaw es un **AI agent gateway self-hosted** que conecta IA con 30+ plataformas de mensajería (WhatsApp, Telegram, iMessage, Discord, Slack, Signal, etc.).

**Dónde corre:** elitemini (homelab MINISFORUM UM890 Pro, hostname `elitemini`)
**Puerto por defecto:** `18789`
**Conectividad con ebuddy:** Tailscale — `OPENCLAW_BASE_URL=http://<tailscale-ip-elitemini>:18789`

### Endpoints principales

| Endpoint | Uso |
|---|---|
| `POST /hooks/wake` | Evento fire-and-forget: `{"text":"descripción","mode":"now"}` |
| `POST /hooks/agent` | Corre un agente con sesión aislada (ver payload abajo) |
| `POST /v1/responses` | API estilo OpenAI para conversación con sesión persistente |

**Payload `/hooks/agent`:**
```json
{
  "message": "texto del usuario",
  "agentId": "nombre-del-agente",
  "deliver": true,
  "channel": "whatsapp|telegram|imessage|slack",
  "to": "id-del-destinatario",
  "timeoutSeconds": 300
}
```

**Payload `/v1/responses`:**
```json
{
  "model": "openclaw",
  "input": "texto",
  "user": "clave-de-sesion-estable",
  "stream": false
}
```

### Autenticación

Dos tokens separados (nunca reutilizar entre sí):
- **Webhooks:** `Authorization: Bearer <hooks.token>` — para `/hooks/*`
- **Gateway:** `Authorization: Bearer <gateway.token>` — para `/v1/responses`

Configurar en elitemini:
```bash
openclaw config set hooks.token tu-token-secreto
openclaw config set gateway.token tu-token-gateway
```

### Variables de entorno en ebuddy (GitHub Secrets + deploy.yml)

```
OPENCLAW_BASE_URL=http://<tailscale-ip-elitemini>:18789
OPENCLAW_HOOK_TOKEN=<hooks.token configurado en elitemini>
OPENCLAW_GATEWAY_TOKEN=<gateway.token configurado en elitemini>
```

**Al agregar variables nuevas**, también añadirlas en el step **"Write .env on Droplet"** del `deploy.yml` (env + envs + grep).

### Limitaciones importantes

- **Sin cola persistente:** webhooks se pierden si OpenClaw se reinicia durante el procesamiento
- **Sin deduplicación:** implementar idempotencia en ebuddy con session keys o event IDs
- **HTTP plano en 18789:** usar Tailscale para cifrado en tránsito — nunca exponer el puerto a internet
- OpenClaw en elitemini requiere que Ollama escuche en `OLLAMA_HOST=0.0.0.0` para recibir requests vía Tailscale

### Configuración en elitemini (una sola vez)

```bash
# OpenClaw escucha en todas las interfaces para Tailscale
openclaw config set gateway.host 0.0.0.0

# Verificar
openclaw doctor
```

---

## Notas de operación

- **Ambiente único:** Solo existe `prod` — no hay dev/staging. `ENVIRONMENT=prod` en `infra/config/main.env`. Todos los recursos DO se llaman `ebuddy-prod-*`.
- **Costo objetivo:** < $35 USD/mes (Droplet s-1vcpu-2gb + DOCR + DB)
- **URL producción:** `https://ebuddy.innovateoncorp.com`
- **Entorno:** MVP de uso propio, un solo usuario (Martín)
- **Timezone:** America/Tijuana
