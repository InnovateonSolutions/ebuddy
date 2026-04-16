# Seguridad — Resumen Actual

---

## Controles vigentes en el repo

- Middleware protege páginas y APIs privadas.
- `userId` se inyecta desde sesión validada, no desde el cliente.
- Validación de inputs con `zod` en endpoints sensibles.
- Audio procesado y descartado después de transcribir.
- Secrets solo en variables de entorno server-side.

---

## Autenticación

- El proyecto usa `next-auth` v5.
- Las rutas privadas pasan por `middleware.ts`.
- Las APIs protegidas reciben `x-user-id` desde middleware.

---

## Datos y secretos

- La app usa PostgreSQL como fuente de verdad.
- El acceso a DB se hace vía Drizzle.
- Las credenciales nunca deben ir en `NEXT_PUBLIC_*`.
- La referencia vigente de variables está en `docs/development/environment-variables.md`.

---

## Riesgos y supuestos

- Si un documento viejo menciona AWS ECS o Supabase como control principal,
  debe considerarse histórico.
- Las reglas operativas obligatorias para agentes siguen en `AGENTS.md`.
- Si se formaliza una postura de seguridad más detallada, este archivo debe
  crecer desde el estado actual del código, no reciclar arquitectura vieja.
