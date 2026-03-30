# Monitoreo — ebuddy

> Observabilidad para el entorno prod/MVP en DigitalOcean Droplet.

---

## Stack de observabilidad

```
Logs estructurados (JSON)
    │
    ▼
Docker stdout/stderr → docker logs / docker compose logs
    │
    └─ Consultas manuales via SSH

DO Monitoring (Droplet metrics)
    │
    └─ Alertas → Email al alert_email configurado en tfvars
```

---

## Alertas activas (DO Monitoring)

### 1. CPU alta (`ebuddy-prod-cpu-high`)

**Condición:** CPU > 85% durante 5 minutos.
**Acción:** Email al `alert_email`.
**Causa probable:** Loop en llamadas a IA, request muy pesado, o el Droplet necesita upgrade de tamaño.

### 2. Memoria alta (`ebuddy-prod-memory-high`)

**Condición:** Memoria > 85% durante 5 minutos.
**Acción:** Email al `alert_email`.
**Causa probable:** Memory leak en la app, demasiadas imágenes Docker acumuladas (limpiar con `docker image prune`), o el Droplet necesita upgrade.

### 3. Disco lleno (`ebuddy-prod-disk-high`)

**Condición:** Disco > 80%.
**Acción:** Email al `alert_email`.
**Causa probable:** Imágenes Docker antiguas acumuladas. Limpiar con `docker system prune`.

---

## Logs estructurados

Todos los API Routes loggean en JSON a stdout, que Docker captura:

```json
{
  "event": "ticket.created",
  "userId": "uuid",
  "ticketId": "uuid",
  "context": "NEGOCIO",
  "durationMs": 3421,
  "endpoint": "/api/tickets/capture"
}
```

### Ver logs desde local

```bash
# Streaming en tiempo real
ssh root@<droplet_ip> \
  "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs -f app"

# Tickets creados hoy
ssh root@<droplet_ip> \
  "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs app" | \
  grep '"event":"ticket.created"'

# Requests lentos (>5s)
ssh root@<droplet_ip> \
  "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs app" | \
  python3 -c "
import sys, json
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('durationMs', 0) > 5000:
            print(line.strip())
    except: pass
"

# Errores recientes
ssh root@<droplet_ip> \
  "docker compose -f /opt/ebuddy/docker-compose.prod.yml logs --tail=500 app" | \
  grep ERROR
```

---

## Métricas del Droplet (DO Dashboard)

Ver en: **cloud.digitalocean.com → Droplets → ebuddy-prod-droplet → Graphs**

| Métrica | Target |
|---|---|
| CPU Utilization | < 70% en promedio |
| Memory Utilization | < 75% en promedio |
| Disk Utilization | < 70% |
| Bandwidth | Indicativo — no hay costo extra en DO |

---

## Costos de IA (monitoreo externo)

Configurar alertas de gasto en los dashboards de los proveedores:

| Proveedor | Dashboard | Alerta recomendada |
|---|---|---|
| OpenAI | platform.openai.com → Usage | $5/mes |
| Anthropic | console.anthropic.com → Usage | $5/mes |

Costo esperado para 1 usuario activo:
- Whisper: ~100 grabaciones × 30s × $0.006/min = **$0.30/mes**
- Claude (sonnet-4-6): ~200 tickets × 500 tokens = **~$0.30/mes**
- **Total IA: < $1/mes**

Si supera $5/mes, revisar logs para detectar loops o inputs sin límite de longitud.

---

## Health check manual

```bash
# Desde local
curl https://<domain>/api/health
# → {"status":"ok","timestamp":"..."}

# Desde el Droplet (sin HTTPS)
ssh root@<droplet_ip> "curl -s http://localhost:3000/api/health"
```
