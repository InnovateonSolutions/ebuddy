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

- Verificar el resultado en GitHub Actions
- **NO cerrar el ticket hasta que el pipeline esté verde**
- Si falla: diagnosticar, corregir, push, iterar hasta pasar

```bash
gh run list --limit 3
gh run view <run_id>
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
| `docs/architecture/adr/005-openclaw-homelab.md` | Proyecto futuro, no en producción | — |
| `docs/integrations/openclaw.md` | Ideas futuras, no documentación viva | — |
| `docs/infrastructure/homelab.md` | Hardware aún no recibido | — |
| `docs/plan-trabajo-mvp.md` | Plan ejecutado; estado real en Jira | — |

---

## Notas de operación

- **Costo objetivo:** < $35 USD/mes (Droplet s-1vcpu-2gb + DOCR + DB)
- **URL producción:** `https://ebuddy.innovateoncorp.com`
- **Entorno:** MVP de uso propio, un solo usuario (Martín)
- **Timezone:** America/Tijuana
