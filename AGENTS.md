# ebuddy — Guía para Agentes de IA

Este documento define los lineamientos de desarrollo para cualquier agente de IA
(Claude, GPT, Gemini, etc.) que trabaje en este repositorio. Léelo antes de hacer
cualquier cambio.

---

## Mapa de lectura rápida

- `SIEMPRE`: reglas que deben cargarse en cualquier turno
- `CONDICIONAL`: reglas que aplican solo si el tipo de cambio lo requiere
- `REFERENCIA`: contexto útil para abrir bajo demanda, no por defecto

Si estás corto de contexto o tokens, primero lee solo estas secciones:

1. `Cómo usar este documento`
2. `Reglas no negociables`
3. `Bucle corto por turno`
4. `Matriz mínima de validación`
5. `Cuándo escalar antes de seguir`

El resto se consulta bajo demanda.
No releer secciones `REFERENCIA` salvo que el cambio toque directamente ese ámbito.

## [SIEMPRE] Cómo usar este documento

AGENTS.md no intenta capturar todo el contexto del sistema.
La meta es dar a cualquier agente una guía corta para iterar con seguridad,
validar lo necesario antes de subir cambios y saber cuándo abrir documentación
más profunda.

Úsalo en este orden:

1. Leer `Reglas no negociables`
2. Identificar el tipo de tarea en `Matriz mínima de validación`
3. Ejecutar el `Bucle corto por turno`
4. Si la tarea escala en riesgo, seguir el `Pipeline de desarrollo obligatorio`
5. Abrir documentación específica solo si el cambio lo requiere

## [SIEMPRE] Definition of Done mínima

Antes de dar un cambio por listo:

- la validación proporcional al cambio está en verde
- si el objetivo del turno ya es subir cambios, la suite completa relevante ya corrió localmente, no solo checks focalizados
- no hay scope creep respecto al requerimiento actual
- el impacto en seguridad, runtime o deploy fue revisado si aplicaba
- las docs o contratos estructurales se actualizaron si cambió una convención viva
- si el objetivo incluye integración completa, el trabajo no termina en verde local
- **cualquier push requiere revisar CI y Deploy en GitHub Actions — no solo integración completa, sino siempre; el trabajo no termina hasta que ambos estén en verde o el fallo esté diagnosticado**

## [SIEMPRE] Reglas no negociables

- Antes de usar cualquier CLI, librería o API: leer su `--help` o documentación oficial
- No asumir flags, comportamiento por defecto ni formatos de salida
- No revertir cambios ajenos ni archivos borrados intencionalmente
- Validar lo relevante antes de commit o push; no empujar cambios sin checks acordes al impacto
- **Después de cualquier push: revisar CI y Deploy en GitHub Actions antes de dar la tarea por cerrada — sin excepción**
- Si un job falla: leer los logs del workflow y hacer troubleshooting antes de escalar o cerrar
- Si aparece una excepción nueva de arquitectura, organización o flujo, primero se actualiza `AGENTS.md` y luego se implementa el cambio
- Si una decisión cambia arquitectura, permisos, runtime, deploy o seguridad, detenerse y escalar antes de asumir

## [SIEMPRE] Convención de automatización

- GitHub Actions es solo orquestador: dispara jobs, pasa inputs/secrets y compone pasos
- Bash es glue operativo: enlaza CLIs, variables de entorno y comandos del sistema
- Python y Go se usan para testing o ejecución cuando sean la mejor herramienta para lógica, parsing, validaciones, contratos o binarios operativos
- No esconder lógica compleja dentro de YAML si puede vivir en un script probado y reutilizable

## [SIEMPRE] Bucle corto por turno

En cada turno, recorrer este ciclo:

1. Entender el requerimiento y clasificar el tipo de cambio
2. Leer solo la documentación o ayuda estrictamente necesaria
3. Definir la validación mínima que aplica
4. Escribir o ajustar tests primero si el cambio modifica comportamiento
5. Implementar el mínimo necesario
6. Ejecutar checks relevantes
7. Revisar impacto real antes de commit o push
8. Tras el push: esperar CI y Deploy, revisar resultado, hacer troubleshooting si falla

## [SIEMPRE] Matriz mínima de validación

Usar esta matriz para cargar solo el contexto y checks que sí aplican:

| Si el cambio toca... | Validación mínima obligatoria |
|---|---|
| TypeScript o App Router | `npx tsc --noEmit` |
| Lógica de negocio en TS | `npm run test:run` |
| Scripts, workflows, contratos estructurales o documentación operativa | `python3 -m pytest scripts/tests/ -v` |
| Páginas del dashboard | test estructural para `export const dynamic = 'force-dynamic'` y verificación de columnas reales del schema |
| Variables de entorno, deploy o runtime | revisar `deploy.yml`, `scripts/deploy.sh` y el step `Write .env on Droplet` |
| OpenClaw o componentes en `elitemini` | revisar `docs/operations/openclaw-runtime-reference.md` y confirmar si la fuente de verdad es Ansible, `deploy.yml` o ambos |
| Seguridad, auth o aislamiento por usuario | revisar middleware, rutas afectadas y el filtro explícito por `userId` |
| Solo análisis o diseño, sin code changes | no inventar cambios; dejar riesgos, supuestos y siguiente paso validable |

## [SIEMPRE] Cuándo escalar antes de seguir

Detenerse y pedir alineación cuando:

- hay varias soluciones razonables con tradeoffs no obvios
- el cambio cambia arquitectura, permisos, runtime, deploy o seguridad
- aparecen cambios inesperados del usuario que chocan con la tarea actual
- completar la tarea requiere tocar producción, credenciales o acciones manuales persistentes
- falta contexto esencial que no puede inferirse de forma segura desde el repo

## [SIEMPRE] Fuentes de verdad rápidas

Abrir solo la fuente que aplique:

| Tema | Fuente principal |
|---|---|
| Arquitectura actual | `docs/architecture/overview.md` |
| Seguridad y supuestos actuales | `docs/security/overview.md` |
| Variables de entorno | `docs/development/environment-variables.md` |
| Deploy y runtime | `.github/workflows/deploy.yml`, `scripts/deploy.sh`, `docs/operations/deploy-runtime-reference.md` |
| Infraestructura | `infra/terraform/`, `docs/infrastructure/` |
| OpenClaw en `elitemini` | `docs/operations/openclaw-runtime-reference.md` + playbooks/roles de Ansible |
| Convenciones estructurales protegidas | `scripts/tests/` |

## [CONDICIONAL] Pipeline de desarrollo obligatorio

Cuando el usuario diga **"desarrolla [X]"**, **"implementa [X]"** o equivalentes,
usar este pipeline completo como camino por defecto para cambios de implementación
con impacto real en código, tests, deploy o runtime. Si la tarea es solo análisis,
diseño o documentación menor sin cambio funcional, basta con validación proporcional.
Cuando aplique, ejecutar estos pasos en orden sin saltarse ninguno:

### 1. Crear ticket en Jira

Usar el script canónico. Si faltan variables `JIRA_*`, revisar `.envrc.example`
y `scripts/jira/`.

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
- Cuando la tarea ya va a milestone de push: correr la validación completa relevante del repo, no solo tests focalizados
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

**Agrupación de commits:** Cuando varias iters pertenecen al mismo dominio, agruparlas en 1-2 commits y hacer un solo push — no un commit + esperar CI por cada cambio minúsculo. Un commit por iter solo aplica si las iters son independientes y de alto impacto individual.

### 7. Esperar que el pipeline CI/CD pase

- Verificar el resultado en GitHub Actions — **SIEMPRE revisar CI y Deploy, no solo CI**
- **NO cerrar el ticket hasta que CI y Deploy estén en verde**
- Si falla: diagnosticar leyendo los logs del workflow antes de asumir la causa
- Si el objetivo del turno incluye subir cambios, continuar hasta revisar el pipeline y hacer troubleshooting básico del fallo antes de dar la tarea por cerrada

```bash
gh run list --limit 5                        # ver estado de CI y Deploy
gh run view <run_id> --log-failed            # logs del job fallido
gh run view <run_id> --log | grep -E "(error|Error|failed|FAILED)" | head -20
```

Para edge cases de deploy, migraciones y diagnóstico de producción, abrir
`docs/operations/deploy-runtime-reference.md`.

### 8. Cerrar ticket en Jira

Solo cuando el CI/CD esté en verde:

```bash
./scripts/jira/close-issue.sh KAN-XX
```

El script resuelve automáticamente el ID de la transición "Done" y la aplica.
Para usar otro estado de cierre: `./scripts/jira/close-issue.sh KAN-XX "In Review"`

---

## [SIEMPRE] Organización de módulos compartidos (`lib/`)

Toda la lógica reutilizable vive en `lib/`. Las rutas y páginas deben ser delgadas
y delegar a estos módulos. **No recrear archivos en `types/` ni `hooks/`.**
Todo helper reutilizable nuevo vive en `lib/`.
Si aparece una excepción nueva, primero se actualiza `AGENTS.md` y luego se implementa el cambio en el código.

Regla de borde:

- si la lógica pertenece claramente a un dominio y solo se reutiliza dentro de ese dominio, puede vivir en `features/<dominio>/`
- usar `lib/` solo para contratos o utilidades realmente compartidas entre dominios o capas

---

## [SIEMPRE] Reglas críticas de arquitectura

1. **El frontend nunca llama a APIs externas directamente** — todo vía API Routes
2. **`userId` nunca viene del cliente** — siempre del JWT validado por middleware
3. **El audio nunca se persiste** — procesar y descartar inmediatamente
4. **Aislamiento por `userId` en cada query** — el middleware de next-auth valida la sesión; el `userId` se extrae del JWT y se aplica como filtro explícito en cada query de Drizzle. No se usa RLS nativo de PostgreSQL (no está disponible en DO Managed DB sin Supabase)
5. **Sin `any` explícito en TypeScript** — `strict: true` en tsconfig

---

## [SIEMPRE] Reglas anti-drift de UX y producto

Estas reglas existen para evitar que la implementación se vuelva a alejar de la experiencia y organización definidas por el repo.

1. **Las rutas autenticadas comparten un único patrón de navegación** — no se crean navbars o layouts paralelos para superficies privadas equivalentes
2. **No mezclar `PublicNav` dentro de rutas protegidas** — la navegación pública y la autenticada deben permanecer separadas
3. **La landing, login, status y settings deben describir el mismo estado real del producto** — si cambia el runtime, se actualiza el copy visible en todas esas superficies dentro del mismo ticket
4. **Eliminar mensajes legacy de "despliegue inicial"** cuando ya no describan el estado real del producto o del entorno
5. **Todo texto visible al usuario debe mantener el mismo idioma base por superficie** — si una vista está en español, labels, estados, CTAs y mensajes auxiliares también permanecen en español salvo nombres propios
6. **No introducir labels de estados en inglés si la UI de esa vista está en español**

Si una nueva feature necesita romper una de estas reglas, el ticket debe incluir la excepción explícita y `AGENTS.md` se actualiza en el mismo cambio para evitar una segunda convención implícita.

---

## [CONDICIONAL] Estándares de UI/UX obligatorios

Mantener solo los invariantes que protegen la UX del dashboard:

- **Top nav (≥ sm)** + **bottom nav fija (< sm)** en rutas autenticadas
- **Dropdown de perfil** en avatar; nunca botón inline de salir
- **Feedback inmediato** en operaciones async y estados vacíos explícitos
- **Confirmación antes de acciones destructivas**
- **Touch targets >= 44px** y layout mobile-first
- **Lucide React** como única librería de íconos

---

## [REFERENCIA] Deploy y runtime

Resumen mínimo:

- DOCR debe autenticarse escribiendo credenciales inline en `~/.docker/config.json`
- El step de credenciales va antes de `docker/setup-buildx-action`
- Las migraciones corren desde el Droplet con el stage `migrator`
- El contenedor de migración vigente es `registry.digitalocean.com/ebuddy-prod/ebuddy:migrator`
- Las variables nuevas también deben añadirse al step `Write .env on Droplet`

Abrir detalle completo en `docs/operations/deploy-runtime-reference.md`.

---

## [CONDICIONAL] Flujo TDD paso a paso

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

## [SIEMPRE] Archivos eliminados intencionalmente

Estos archivos **no deben recrearse**.

Resumen de invariantes:

- no recrear `types/api.ts`, `types/database.ts` ni hooks legacy eliminados
- no reintroducir `CLAUDE.md` ni docs históricas removidas como segunda fuente de verdad
- si dudas sobre un archivo eliminado, revisar `scripts/tests/` y el historial git antes de recrearlo

---

## [REFERENCIA] OpenClaw — Integración de mensajería

Resumen mínimo:

- OpenClaw corre en `elitemini` y `ebuddy` se conecta por Tailscale
- `ebuddy` usa tokens separados para webhooks y gateway
- Si cambias variables de entorno, también debes actualizar `deploy.yml`
- OpenClaw no tiene cola persistente ni deduplicación nativa
- **Toda instalación, upgrade, bootstrap o cambio persistente de configuración de OpenClaw debe gestionarse vía Ansible**
- Los comandos `openclaw ...` en shell se permiten solo para:
  - diagnóstico temporal
  - verificación puntual
  - recuperación manual durante incidentes, seguida de la automatización equivalente en Ansible

Abrir detalle completo en `docs/operations/openclaw-runtime-reference.md`.

---

## [REFERENCIA] Notas de operación

- **Ambiente único:** Solo existe `prod` — no hay dev/staging. `ENVIRONMENT=prod` en `infra/config/main.env`. Todos los recursos DO se llaman `ebuddy-prod-*`.
- **Costo objetivo:** < $35 USD/mes (Droplet s-1vcpu-2gb + DOCR + DB)
- **URL producción:** `https://ebuddy.innovateoncorp.com`
- **Entorno:** MVP de uso propio, un solo usuario (Martín)
- **Timezone:** America/Tijuana
