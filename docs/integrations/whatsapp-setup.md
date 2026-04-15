# WhatsApp — Proceso de Adquisición y Configuración (KAN-32)

## Decisión de implementación

**Opción elegida: WhatsApp Business API (Meta Cloud API)**

| Opción | Costo | Estabilidad | Requiere |
|---|---|---|---|
| **Meta Cloud API** (elegida) | ~$0 en volumen bajo | Alta — API oficial | Cuenta Meta Business |
| Baileys (unofficial) | $0 | Media — reverse-eng | Número personal + QR |
| Twilio WhatsApp | $0.005/msg | Alta | Cuenta Twilio |

**Por qué Meta Cloud API sobre Baileys:** Para el MVP con un único usuario el volumen es casi $0 en costos. La API oficial no requiere tener el teléfono encendido, no tiene sesiones que expiran, y no viola los TOS de WhatsApp.

---

## Pasos para adquirir el número (hacerlo UNA VEZ)

### 1. Crear cuenta Meta Business
- Ir a [business.facebook.com](https://business.facebook.com)
- Crear cuenta de negocio con `innovateonsolutions@gmail.com`
- Verificar el negocio (formulario básico)

### 2. Crear app en Meta for Developers
- Ir a [developers.facebook.com](https://developers.facebook.com)
- **Create App** → tipo: **Business**
- Nombre: `ebuddy-assistant`
- En la app, agregar el producto **WhatsApp**

### 3. Obtener número de teléfono dedicado
Meta provee un número de prueba gratuito para desarrollo. Para producción:
- Agregar un número de teléfono real (puede ser una línea VoIP o SIM dedicada)
- Verificar el número con el código SMS que envía Meta
- El número NO puede estar vinculado a WhatsApp personal ni WhatsApp Business app

**Opción más simple para MVP:** Usar el número de prueba de Meta (permite enviar a 5 contactos verificados — suficiente para uso propio).

### 4. Obtener las credenciales

En **Meta for Developers → Tu app → WhatsApp → API Setup**:

| Variable | Dónde encontrarla |
|---|---|
| `WHATSAPP_API_TOKEN` | "Temporary access token" (24h) o generar token permanente |
| `WHATSAPP_PHONE_NUMBER_ID` | "Phone Number ID" en la sección de configuración |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | "WhatsApp Business Account ID" |

### 5. Generar token permanente (para producción)
1. En Meta Business Suite → **System Users** → crear usuario de sistema
2. Asignar permisos: `whatsapp_business_messaging`, `whatsapp_business_management`
3. Generar token permanente (no expira en 24h)
4. Guardar el token — solo se muestra una vez

### 6. Configurar webhook (para recibir mensajes de Martín)
- URL del webhook: `https://app.ebuddy.io/api/webhooks/whatsapp`
- Verify Token: generar uno aleatorio y guardarlo como `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Suscribirse a: `messages`

---

## Agregar los secrets a GitHub

```bash
gh secret set WHATSAPP_API_TOKEN        --body "EAAx..."
gh secret set WHATSAPP_PHONE_NUMBER_ID  --body "123456789012345"
gh secret set WHATSAPP_BUSINESS_ACCOUNT_ID --body "987654321098765"
gh secret set WHATSAPP_WEBHOOK_VERIFY_TOKEN --body "$(openssl rand -hex 32)"
```

---

## Verificar la configuración

Después de configurar los secrets, correr el workflow de validación:

```
GitHub → Actions → Operations → Run workflow → `task = whatsapp-config`
```

O localmente:
```bash
WHATSAPP_API_TOKEN=EAAx... \
WHATSAPP_PHONE_NUMBER_ID=123... \
WHATSAPP_BUSINESS_ACCOUNT_ID=987... \
  bash scripts/check-whatsapp-config.sh
```

---

## Flujo de mensajes (una vez configurado OpenClaw)

```
Martín (teléfono)
  │ Envía mensaje a número de WhatsApp Business
  ▼
Meta Cloud API
  │ POST al webhook: https://app.ebuddy.io/api/webhooks/whatsapp
  ▼
API Server (KAN-18 endpoint)
  │ Valida webhook verify token
  │ Extrae texto del mensaje
  │ Llama al Motor de IA (Claude)
  ▼
Ticket creado en la plataforma web
  │
  ▼
Meta Cloud API envía respuesta a Martín
  "✓ Trabajo · 'Título del ticket' · Prioridad ALTA"
```

---

## Criterios de aceptación (KAN-32)

- [ ] Número de WhatsApp Business activo y verificado
- [ ] `WHATSAPP_API_TOKEN` configurado en GitHub Secrets
- [ ] `WHATSAPP_PHONE_NUMBER_ID` configurado en GitHub Secrets
- [ ] `WHATSAPP_BUSINESS_ACCOUNT_ID` configurado en GitHub Secrets
- [ ] Workflow **Operations** con `task = whatsapp-config` pasa en GitHub Actions
- [ ] Martín puede enviar un mensaje de prueba al número y recibirlo en el webhook
