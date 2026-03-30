# ADR 002 — Supabase como BaaS (DB + Auth + Realtime)

**Estado:** Aceptado
**Fecha:** Marzo 2026
**Autor:** Martín Cuevas Tavizón

---

## Contexto

El MVP necesita PostgreSQL con RLS, autenticación (email + OAuth Google), y actualizaciones en tiempo real en la UI sin polling. Construir estas tres piezas desde cero en el MVP sería tiempo derrochado que no genera valor al usuario.

Alternativas evaluadas:

| Opción | DB | Auth | Realtime | Costo estimado MVP |
|---|---|---|---|---|
| **Supabase (elegida)** | PostgreSQL 15 + RLS | Built-in JWT + OAuth | WebSockets built-in | Free tier → ~$25/mes |
| AWS RDS + Cognito + API GW WS | PostgreSQL 15 | Cognito | API Gateway WebSocket | ~$30-50/mes más complejo |
| PlanetScale + Auth0 + Pusher | MySQL (no RLS nativo) | Auth0 | Pusher | ~$50/mes + 3 vendors |
| Firebase | Firestore (NoSQL) | Built-in | Built-in | Free tier → ~$10/mes pero NoSQL limita queries |

## Decisión

Supabase con el plan **Free** durante MVP (hasta 500MB DB, 50k MAU, 2GB storage). Si el uso propio supera el free tier, migrar a Pro ($25/mes) antes de añadir usuarios reales.

### Por qué no AWS RDS directamente

El shared responsibility model es importante para producción, pero en fase de desarrollo/MVP el overhead operativo de gestionar RDS, backups, parameter groups, y security groups de DB supera el beneficio. Supabase gestiona eso mientras el equipo (1 persona) valida el producto.

Para producción con datos reales de usuarios, evaluar migrar a RDS con pgvector si se añaden features de embeddings.

## Consecuencias

**Positivas:**
- RLS nativo en PostgreSQL: `auth.uid()` disponible en todas las políticas.
- Migraciones con Supabase CLI versionadas en git (`supabase/migrations/`).
- Realtime subscription en tabla `tickets` — tickets aparecen en UI sin reload.
- OAuth Google disponible out-of-the-box sin configurar un auth server propio.
- JS SDK genera tipos TypeScript automáticamente desde el schema.

**Negativas / Riesgos aceptados:**
- Supabase Free tiene límite de 2 proyectos activos simultáneos.
- Si Supabase tiene downtime, toda la aplicación cae. Aceptable en MVP de uso propio.
- Los tokens OAuth de calendarios se almacenan en Supabase. Para cumplimiento estricto en producción, considerar AWS Secrets Manager o KMS.

## Criterio de revisión

Si ebuddy escala a múltiples usuarios o si compliance requiere datos en control exclusivo de AWS, migrar DB a RDS PostgreSQL + Cognito. Las interfaces de Supabase JS SDK están encapsuladas en `lib/supabase/` para facilitar esta migración.
