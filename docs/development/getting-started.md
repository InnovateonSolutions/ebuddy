# Inicio Local — ebuddy

---

## Pre-requisitos

```bash
node --version   # >= 20.x
npm --version    # >= 10.x
docker --version # >= 24.x
```

---

## 1. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con valores reales. La referencia vigente está en
[environment-variables.md](environment-variables.md).

Variables mínimas para arrancar:

- `DATABASE_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Si también quieres que los agentes automaticen Jira siguiendo `AGENTS.md`, define
además estas variables de entorno en tu shell local:

- `JIRA_BASE_URL`
- `JIRA_PROJECT_KEY`
- `JIRA_EMAIL`
- `JIRA_TOKEN`

La forma más cómoda por proyecto es `direnv` con un `.envrc` local no versionado:

```bash
cp .envrc.example .envrc
direnv allow
```

Los scripts disponibles quedan en `scripts/jira/`:

```bash
./scripts/jira/create-issue.sh --help
./scripts/jira/transitions.sh KAN-123
./scripts/jira/close-issue.sh KAN-123
```

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Levantar PostgreSQL local

La forma más simple es levantar solo la base de datos con Docker Compose:

```bash
docker compose up -d db
```

Esto expone PostgreSQL en `localhost:5432`.

Ejemplo de `DATABASE_URL` para local:

```bash
DATABASE_URL=postgresql://ebuddy:ebuddy_local@localhost:5432/ebuddy
```

Si prefieres ejecutar toda la app con Docker:

```bash
docker compose up -d
```

---

## 4. Levantar la aplicación

Desarrollo interactivo:

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

---

## 5. Verificar que todo funciona

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{"status":"ok","ts":"..."}
```

---

## Comandos frecuentes

```bash
npm run dev
npm run build
npx tsc --noEmit
npm run test:run
python3 -m pytest scripts/tests/ -v
docker compose up -d db
docker compose down
```

---

## Estructura relevante

```
ebuddy/
├── app/                        Páginas y Route Handlers
├── components/                 UI reutilizable
├── hooks/                      Hooks React activos
├── lib/
│   ├── ai/                     Whisper + Claude
│   ├── auth/                   next-auth
│   ├── calendar/               Integraciones Google/Microsoft
│   ├── db/                     Schema y conexión Drizzle
│   ├── calendar.ts             Agregación de calendario
│   ├── tickets.ts              Queries compartidas
│   └── types.ts                Tipos compartidos
├── drizzle/                    SQL versionado
├── infra/terraform/            Infraestructura DO
└── scripts/tests/              Tests estructurales
```

---

## Troubleshooting

### `Variable de entorno requerida no encontrada`

`lib/env.ts` valida `DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY` y
`ANTHROPIC_API_KEY` al arrancar. Revisa `.env.local`.

### La DB local no responde

```bash
docker compose ps
docker compose logs db
```

### El micrófono no funciona en local

`localhost` está permitido por el navegador. Si usas una IP de red local,
necesitas HTTPS.
