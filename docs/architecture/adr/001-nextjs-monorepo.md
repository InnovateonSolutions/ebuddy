# ADR 001 — Next.js Monorepo Fullstack

**Estado:** Aceptado
**Fecha:** Marzo 2026
**Autor:** Martín Cuevas Tavizón

---

## Contexto

ebuddy requiere tanto UI como lógica de negocio (integración con Whisper, Claude, Google Calendar). Para MVP de un solo founder hay que minimizar la fricción operativa: un repo, un deploy, una sola pipeline de CI/CD.

Las alternativas evaluadas:

| Opción | Pros | Contras |
|---|---|---|
| Next.js monorepo (elegida) | Un repo, API Routes colocadas con la UI, TypeScript compartido | Cold starts en Serverless Functions pueden llegar a 1-2s |
| Separate repos (FE + BE) | Independencia de deploy | Dos pipelines, duplicación de tipos, más overhead de coordinación |
| Remix | SSR muy bueno | Ecosistema más pequeño, menos integración con Vercel/AWS |
| Create React App + Express | Control total | Sin SSR, dos servicios, infra doble |

## Decisión

Next.js 14 con App Router como monorepo fullstack. La UI y las API Routes comparten tipos TypeScript desde `/types/`. Un solo `Dockerfile`, un solo container en ECS Fargate.

## Consecuencias

**Positivas:**
- Un solo repositorio — PRs, issues y revisiones en un solo lugar.
- TypeScript estricto compartido entre frontend y backend desde el primer día.
- `output: 'standalone'` en `next.config.ts` produce un artefacto de Docker auto-contenido (~70MB con node:20-alpine).
- Supabase Realtime se inicializa desde el cliente sin necesidad de WebSocket server propio.

**Negativas / Riesgos aceptados:**
- Si la carga de IA processing crece, los API Routes corren en el mismo container que la UI — monitorear `durationMs` en logs.
- No se puede escalar independientemente la capa de IA vs la UI. Aceptable en MVP con 1 usuario.

## Criterio de revisión

Si P95 de los API Routes de IA supera 10s de forma consistente, extraer el IA Worker a un Lambda/ECS service independiente.
