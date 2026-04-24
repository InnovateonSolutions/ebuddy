# Deploy Runtime Reference

Referencia operativa detallada para cambios que tocan deploy, runtime, migraciones
o escritura de variables de entorno en el Droplet.

## DOCR en GitHub Actions

Metodo correcto: escribir inline base64 a `~/.docker/config.json`.

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

No usar:

- `docker/login-action`
- `doctl registry login`
- `doctl registry docker-config`
- `DOCKER_CONFIG=/tmp/docker-config`

Este step debe ejecutarse antes de `docker/setup-buildx-action`.

## Wait for GC

DOCR GC tiene multiples estados activos. Nunca grep por estado activo; grep por
estados terminales e invertir:

```bash
GC_STATUS="$(doctl registry garbage-collection list "$REGISTRY" --no-header | head -1)"
[ -z "$GC_STATUS" ] || echo "$GC_STATUS" | grep -qE "(succeeded|failed|cancelled)"
```

## Migraciones de DB en CI/CD

DO Managed DB solo acepta conexiones del Droplet. Los runners de GitHub Actions
no pueden correr migraciones directamente contra la DB.

Patron vigente:

1. `Dockerfile` tiene stage `migrator` con drizzle-kit + migraciones
2. Build job empuja `registry.digitalocean.com/ebuddy-prod/ebuddy:migrator`
3. Deploy job en el Droplet ejecuta:

```bash
docker pull registry.digitalocean.com/ebuddy-prod/ebuddy:migrator
docker run --rm --env-file /opt/ebuddy/.env \
  registry.digitalocean.com/ebuddy-prod/ebuddy:migrator
```

No existe job `migrate` separado.

## Escritura de `/opt/ebuddy/.env`

GitHub Actions sobreescribe el placeholder creado por cloud-init:

```yaml
- uses: appleboy/ssh-action@v1
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  with:
    envs: DATABASE_URL,AUTH_SECRET,...
    script: |
      env | grep -E '^(DATABASE_URL|AUTH_SECRET|...)=' > /opt/ebuddy/.env
      echo "NODE_ENV=production" >> /opt/ebuddy/.env
      chmod 600 /opt/ebuddy/.env
```

`env | grep` preserva `KEY=VALUE` sin riesgo de shell injection en valores.

## Edge cases criticos

- `Build & Push` puede fallar silenciosamente si `continue-on-error: true` y el retry tambien falla
- `Run migrations on Droplet` solo corre cuando `migrator_changed == 'true'`
- `drizzle/meta/_journal.json` debe tener una entrada por cada `.sql` en `drizzle/`
- Una migracion puede figurar como aplicada sin haber ejecutado el SQL real
- `Deploy` puede pasar aunque la app siga rota; revisar smoke tests
- Toda variable nueva del codigo debe agregarse tambien al step `Write .env on Droplet`

## Diagnostico rapido

```bash
gh run list --limit 5
gh run view <run_id> --log-failed
gh run view <run_id> --log | grep -E "(error|Error|failed|FAILED)" | head -20
docker logs $(docker ps --format "{{.Names}}" | grep -v caddy | head -1) --tail 80
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='user_preferences';"
```
