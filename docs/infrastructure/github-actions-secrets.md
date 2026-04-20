# GitHub Actions Secrets

## Fuente de verdad

Este documento describe los `Actions secrets` y values operativos que usan los
workflows en `.github/workflows/`. Si agregas o quitas uno:

1. actualiza este documento
2. actualiza `.bootstrap.env.example`
3. actualiza `scripts/setup-secrets.sh`
4. si aplica, actualiza el step `Write .env on Droplet` en `deploy.yml`

## Requeridos para CI/CD principal

- `DO_TOKEN`
- `DO_SPACES_ACCESS_KEY`
- `DO_SPACES_SECRET_KEY`
- `DO_SSH_PRIVATE_KEY`
- `DATABASE_URL`
- `AUTH_SECRET`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## Requeridos para runtime en el Droplet

- `DO_MONITORING_TOKEN`
- `CRON_SECRET`

## Integraciones opcionales de producto

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_REDIRECT_URI`
- `OLLAMA_BASE_URL`
- `OPENCLAW_BASE_URL`
- `OPENCLAW_HOOK_TOKEN`
- `OPENCLAW_GATEWAY_TOKEN`

## Operación y playbooks

- `TAILSCALE_AUTH_KEY`
- `ELITEMINI_SSH_KEY`

## WhatsApp

- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_OWNER_USER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`

## Nota sobre DOCR

`DO_TOKEN` se usa para operar infraestructura y autenticación de DOCR en
workflows. No debe reutilizarse como token de runtime para Monitoring.
`DO_MONITORING_TOKEN` debe mantenerse separado y con alcance mínimo de lectura.
