# ADR 001 — Next.js Monorepo Fullstack

**Estado:** Aprobada
**Fecha:** Marzo 2026

---

## Decisión

El proyecto se mantiene como una sola aplicación Next.js fullstack con App Router.

---

## Razón

- reduce coordinación y despliegues separados
- permite compartir dominio, rutas y tipos del mismo sistema
- encaja con el tamaño actual del proyecto y del equipo

---

## Implicaciones actuales

- páginas y Route Handlers viven en el mismo repo
- el dominio compartido vive en `lib/`
- la app se despliega como una sola unidad
