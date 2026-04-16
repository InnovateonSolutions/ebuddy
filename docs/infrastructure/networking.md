# Redes — Actual

> Topología de red vigente en DigitalOcean.

---

## Flujo principal

```text
Internet
  -> Firewall DigitalOcean
  -> Caddy (:80 / :443)
  -> app Next.js (:3000 interno)
  -> APIs externas
  -> PostgreSQL
```

---

## Entradas públicas

| Puerto | Uso |
|---|---|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |
| 443/UDP | HTTP/3 |

El puerto `3000` no se expone públicamente.

---

## Salidas esperadas

La app necesita salida HTTPS hacia:

- OpenAI
- Anthropic
- Google Calendar API
- Microsoft Graph
- DigitalOcean Container Registry
- PostgreSQL gestionado

---

## Nota histórica

Si algún documento viejo menciona proveedores o saltos de red anteriores, debe
considerarse histórico.
