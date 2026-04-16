# ebuddy — Guía para Agentes de IA

Este documento define los lineamientos de desarrollo para cualquier agente de IA
(Claude, GPT, Gemini, etc.) que trabaje en este repositorio. Léelo antes de hacer
cualquier cambio.

---

## Pipeline de desarrollo obligatorio

Cuando el usuario diga **"desarrolla [X]"**, **"implementa [X]"** o equivalentes,
ejecutar estos pasos en orden sin saltarse ninguno:

### 1. Crear ticket en Jira

- **Proyecto:** KAN (`https://innovateonsolutions.atlassian.net`)
- **Formato obligatorio:**
  - Título accionable y conciso (ej: "Implementar X para Y")
  - Descripción con: **Problema**, **Criterios de aceptación**, **Notas técnicas**
  - Tipo: Story / Task / Bug
  - Prioridad MoSCoW: Must Have / Should Have / Could Have / Won't Have
  - Labels relevantes (frontend, backend, infra, ux, etc.)

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
# Obtener ID de transición "Done"
curl -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  "https://innovateonsolutions.atlassian.net/rest/api/3/issue/KAN-XX/transitions"

# Aplicar transición
curl -u "$JIRA_EMAIL:$JIRA_TOKEN" -X POST \
  -H "Content-Type: application/json" \
  -d '{"transition": {"id": "<id>"}}' \
  "https://innovateonsolutions.atlassian.net/rest/api/3/issue/KAN-XX/transitions"
```

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

## Reglas críticas de arquitectura

1. **El frontend nunca llama a APIs externas directamente** — todo vía API Routes
2. **`userId` nunca viene del cliente** — siempre del JWT validado por middleware
3. **El audio nunca se persiste** — procesar y descartar inmediatamente
4. **RLS activo en todas las tablas** — segunda línea de defensa en DB
5. **Sin `any` explícito en TypeScript** — `strict: true` en tsconfig

---

## Autenticación DOCR en GitHub Actions

**Método correcto** (usar DO_TOKEN directamente):

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

Este step debe ejecutarse **antes** de `docker/setup-buildx-action`.

---

## Estructura de tests estructurales

Los tests en `scripts/tests/` protegen invariantes del proyecto:

| Archivo | Qué protege |
|---|---|
| `test_workflow_triggers.py` | CI/CD: triggers, permisos, orden de steps |
| `test_kanban.py` | Kanban board: auth, DnD, API |
| `test_visit_counter.py` | VisitCounter: PUBLIC_PATHS, guard de tipo |
| `test_api_key.py` | Generación y validación de API keys |
| `test_db_init.py` | Schema SQL inicial |
| `test_render_env.py` | Script de generación de .env en el Droplet |

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

## Notas de operación

- **Costo objetivo:** < $35 USD/mes (Droplet s-1vcpu-2gb + DOCR + DB)
- **URL producción:** `https://ebuddy.innovateoncorp.com`
- **Entorno:** MVP de uso propio, un solo usuario (Martín)
- **Timezone:** America/Tijuana
