# Inicio Local — ebuddy

---

## Pre-requisitos

```bash
node --version   # >= 20.x
npm --version    # >= 10.x
docker --version # >= 24.x
supabase --version  # >= 1.x  (npm install -g supabase)
```

---

## 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url> ebuddy
cd ebuddy
cp .env.example .env.local
```

Editar `.env.local` con los valores reales. Ver [referencia completa](environment-variables.md).

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Levantar Supabase local

```bash
# Inicia PostgreSQL + Auth + Studio en Docker
supabase start

# La salida muestra:
#   API URL: http://localhost:54321
#   DB URL:  postgresql://postgres:postgres@localhost:54322/postgres
#   Studio:  http://localhost:54323
#   anon key: eyJ...
#   service_role key: eyJ...
```

Copiar los valores `API URL`, `anon key` y `service_role key` en `.env.local`.

### Aplicar migraciones

```bash
supabase db reset
# Aplica todas las migraciones en supabase/migrations/ en orden
# Incluye el schema inicial y las políticas RLS
```

---

## 4. Levantar la aplicación

```bash
npm run dev
# → http://localhost:3000
```

El hot reload de Next.js actualiza el browser sin reiniciar el server.

---

## 5. Verificar que todo funciona

```bash
# Health check
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"..."}

# Ver logs de Supabase
supabase logs
```

---

## Comandos frecuentes

```bash
# Desarrollo
npm run dev          # Next.js con hot reload
npm run build        # Build de producción (verifica TypeScript)
npm run lint         # ESLint + TypeScript check

# Supabase
supabase start       # Iniciar servicios locales
supabase stop        # Detener servicios
supabase db reset    # Resetear DB y aplicar migraciones
supabase status      # Ver URLs y keys del entorno local

# Nueva migración
supabase migration new nombre_de_la_migracion
# → crea supabase/migrations/YYYYMMDDHHMMSS_nombre_de_la_migracion.sql

# Tests
npm run test         # vitest (unit + integration)
npm run test:watch   # modo watch
```

---

## Docker local (opcional)

Para probar el build de producción exactamente como se despliega en ECS:

```bash
# Build de la imagen
docker build -t ebuddy:local .

# Correr con las env vars locales
docker run --env-file .env.local -p 3000:3000 ebuddy:local
```

---

## Estructura de carpetas relevante

```
ebuddy/
├── app/
│   ├── (auth)/login/          # Página de login
│   ├── (dashboard)/
│   │   ├── today/             # Vista del día
│   │   ├── future/            # Horizonte futuro
│   │   └── settings/          # Configuración + calendarios
│   └── api/
│       ├── tickets/           # CRUD de tickets + capture
│       ├── calendar/          # Lectura de calendarios
│       ├── auth/calendar/     # OAuth Google + Microsoft
│       └── health/            # Health check para ECS
├── components/                # Componentes React
├── hooks/                     # useAudioRecorder, useRealtimeTickets
├── lib/
│   ├── ai/                    # Whisper + Claude services
│   ├── calendar/              # Google + Microsoft OAuth
│   └── supabase/              # Browser + Server clients
├── supabase/migrations/       # SQL versionado
└── infra/terraform/           # IaC AWS
```

---

## Troubleshooting común

### `Missing env var: ANTHROPIC_API_KEY`
El servidor valida todas las variables al arrancar. Revisar que `.env.local` tiene todos los valores requeridos.

### Supabase no arranca
```bash
supabase stop --no-backup
supabase start
```

### Error de RLS en queries locales
Las políticas RLS requieren un JWT válido. Asegurarse de estar autenticado en la app antes de hacer llamadas a la DB.

### Audio no graba en localhost
Chrome requiere HTTPS para el micrófono. Excepción: `localhost` está permitido sin HTTPS. Si usas una IP local (ej: 192.168.x.x), necesitas configurar HTTPS con `mkcert`.
