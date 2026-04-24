# OpenClaw Runtime Reference

Referencia operativa para integracion, runtime y limites conocidos de OpenClaw
en `elitemini`.

## Topologia actual

- Host: `elitemini`
- Puerto por defecto: `18789`
- Conectividad con `ebuddy`: Tailscale
- Base URL esperada: `OPENCLAW_BASE_URL=http://<tailscale-ip-elitemini>:18789`

## Endpoints principales

| Endpoint | Uso |
|---|---|
| `POST /hooks/wake` | Evento fire-and-forget |
| `POST /hooks/agent` | Corre un agente con sesion aislada |
| `POST /v1/responses` | API estilo OpenAI con sesion persistente |

Payload base de `/hooks/agent`:

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

Payload base de `/v1/responses`:

```json
{
  "model": "openclaw",
  "input": "texto",
  "user": "clave-de-sesion-estable",
  "stream": false
}
```

## Autenticacion

Tokens separados:

- Webhooks: `Authorization: Bearer <hooks.token>`
- Gateway: `Authorization: Bearer <gateway.token>`

Configuracion base:

```bash
openclaw config set hooks.token tu-token-secreto
openclaw config set gateway.token tu-token-gateway
```

## Variables de entorno en ebuddy

```bash
OPENCLAW_BASE_URL=http://<tailscale-ip-elitemini>:18789
OPENCLAW_HOOK_TOKEN=<hooks.token configurado en elitemini>
OPENCLAW_GATEWAY_TOKEN=<gateway.token configurado en elitemini>
```

Toda variable nueva tambien debe agregarse al step `Write .env on Droplet` del
`deploy.yml`.

## Limitaciones importantes

- Sin cola persistente
- Sin deduplicacion nativa
- HTTP plano en `18789`; Tailscale es obligatorio para cifrado en transito
- Ollama debe escuchar en `OLLAMA_HOST=0.0.0.0` para recibir requests via Tailscale

## Configuracion base en elitemini

```bash
openclaw config set gateway.host 0.0.0.0
openclaw doctor
```

## Regla operativa

Toda instalacion, upgrade, bootstrap o cambio persistente de configuracion de
OpenClaw debe gestionarse via Ansible.

Los comandos `openclaw ...` en shell se permiten solo para:

- diagnostico temporal
- verificacion puntual
- recuperacion manual durante incidentes, seguida de la automatizacion equivalente en Ansible

GitHub Secrets y `deploy.yml` siguen siendo la fuente de verdad para
credenciales y runtime de `ebuddy`; Ansible es la fuente de verdad para el host
`elitemini` y la configuracion persistente de OpenClaw.
