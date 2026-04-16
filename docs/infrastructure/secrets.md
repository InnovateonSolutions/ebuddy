# Gestión de Secrets — Actual

---

## Fuente de verdad

- Estructura base: `.env.example`
- Variables requeridas por runtime: `lib/env.ts`
- Configuración pública vigente: `infra/config/main.env`

Si esos tres archivos no coinciden, hay que corregir la documentación.

---

## Runtime de aplicación

Los secrets de runtime no deben vivir en git.

Variables principales:

- `DATABASE_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_REDIRECT_URI`

---

## Infraestructura

Secrets usados para operar Terraform o flujos de despliegue:

- `DO_TOKEN`
- `DO_SPACES_ACCESS_KEY`
- `DO_SPACES_SECRET_KEY`
- `DO_SSH_PRIVATE_KEY`

---

## Reglas

1. Nunca guardar secrets en el repositorio.
2. Nunca exponer secrets con prefijo `NEXT_PUBLIC_`.
3. Si se agrega una variable nueva:
   - actualizar `.env.example`
   - actualizar `lib/env.ts` si aplica
   - actualizar `docs/development/environment-variables.md`

---

## Nota histórica

Las referencias antiguas a plataformas o variables previas deben considerarse
históricas y no operativas.
