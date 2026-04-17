# Runbook — Operación Actual

> Procedimientos de operación del entorno actual.

---

## Despliegue

La validación rápida ocurre en el workflow `CI`.
El despliegue normal ocurre en el workflow `Deploy`, disparado después de un `CI` verde sobre `main`.

Validación mínima después de deploy:

```bash
curl https://ebuddy.innovateoncorp.com/api/health
```

Respuesta esperada:

```json
{"status":"ok","ts":"..."}
```

---

## Verificación en Droplet

```bash
ssh root@<droplet_ip>
docker compose -f /opt/ebuddy/docker-compose.prod.yml ps
docker compose -f /opt/ebuddy/docker-compose.prod.yml logs --tail=100 app
curl http://localhost:3000/api/health
```

---

## Fallas comunes

### La app no arranca

Revisar:

- variables faltantes en `.env`
- errores de build o runtime
- conectividad a PostgreSQL

### El dominio no responde

Revisar:

- DNS
- Caddy
- firewall
- estado del contenedor `app`

### Integraciones externas fallan

Revisar:

- OpenAI / Anthropic
- Google Calendar / Microsoft Graph
- expiración o revocación de credenciales

---

## Notas

- Las instrucciones viejas que mencionaban migraciones manuales en otras
  plataformas ya no son la guía vigente.
- La configuración actual del deploy debe tomarse del código y de `infra/`.
