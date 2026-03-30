# Seguridad — Postura y Compliance

---

## Modelo de responsabilidad compartida (AWS)

```
Responsabilidad del CLIENTE (ebuddy)       Responsabilidad de AWS
──────────────────────────────────────     ──────────────────────────
Código de la aplicación                    Hypervisor y hosts físicos
Configuración de ECS/IAM/SG               Red física del datacenter
Gestión de secretos (Secrets Manager)      Hardware de almacenamiento
Políticas RLS en Supabase                  Plataforma de virtualización
Rotación de credenciales                   Disponibilidad de la región
Validación de inputs del usuario
Headers de seguridad HTTP
```

Este es el motivo por el que se eligió AWS ECS Fargate sobre Vercel: control explícito sobre la capa de red, IAM, y dónde viajan los datos.

---

## Capas de defensa

```
Internet
    │
    ▼ [1] TLS 1.3 — ALB termina el SSL
    │
    ▼ [2] Security Groups — solo puertos 80/443 desde internet
    │
    ▼ [3] Auth Middleware — JWT validado antes de cualquier lógica
    │
    ▼ [4] Validación de inputs — Zod en todos los endpoints
    │
    ▼ [5] Row Level Security — Supabase garantiza aislamiento de datos
    │
    ▼ Datos del usuario
```

Cualquier request malicioso que supere una capa, la siguiente lo detiene.

---

## Autenticación y autorización

### JWT

- Emitido por Supabase Auth al hacer login.
- Validado en cada request por el Middleware (firma + expiración).
- `userId` se extrae **del JWT**, nunca del body/query params del request.
- Si el JWT es inválido o expirado: `401 Unauthorized` inmediato.

### RLS (Row Level Security)

Todas las tablas tienen RLS activo:

```sql
-- Política base en todas las tablas
CREATE POLICY "user isolation" ON tickets
  FOR ALL USING (auth.uid() = user_id);
```

Incluso si hay un bug en el Middleware que permita requests sin autenticar, Supabase RLS garantiza que una query no retorna datos de otro usuario.

### OAuth (Calendarios)

- Access tokens: vida de 60 minutos. El Calendar Service los renueva automáticamente.
- Refresh tokens: almacenados cifrados en la columna `access_token`/`refresh_token` de la tabla `calendar_tokens` (Supabase Vault / pgsodium).
- Scope mínimo: solo `Calendars.Read`. No se solicita escritura.

---

## Gestión de secretos

| Secreto | Almacenamiento | Quién accede |
|---|---|---|
| API Keys (OpenAI, Anthropic) | AWS Secrets Manager | ECS Task en runtime |
| Supabase Service Role Key | AWS Secrets Manager | ECS Task en runtime |
| OAuth Client Secrets (Google, MS) | AWS Secrets Manager | ECS Task en runtime |
| Tokens OAuth de calendarios | Supabase DB (cifrado) | Calendar Service |

**Nunca en:**
- Código fuente o commits
- Variables `NEXT_PUBLIC_*` (visibles en el browser)
- Logs de la aplicación

---

## Headers de seguridad HTTP

Configurados en `next.config.ts`:

| Header | Valor | Propósito |
|---|---|---|
| `X-Frame-Options` | `DENY` | Previene clickjacking |
| `X-Content-Type-Options` | `nosniff` | Previene MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita Referer a mismo origen |
| `Permissions-Policy` | `microphone=(self)` | Solo el propio origen puede pedir el micrófono |

---

## Protección contra ataques comunes

### SQL Injection
**Mitigado por arquitectura:** el Supabase JS SDK usa queries parametrizadas. Nunca se construye SQL con interpolación de strings de usuario.

### XSS
**Mitigado por Next.js:** React escapa el HTML por defecto. No se usa `dangerouslySetInnerHTML` con datos del usuario.

### CSRF
**Mitigado:** las API Routes validan el JWT en el header `Authorization`, no cookies de sesión. Sin cookie de sesión, los ataques CSRF clásicos no aplican.

### Prompt Injection
El input del usuario se encapsula entre delimitadores antes de enviarlo a Claude:
```
<user_input>
{texto del usuario}
</user_input>
```
Esto separa claramente las instrucciones del sistema del contenido del usuario.

### SSRF (Server-Side Request Forgery)
El ECS Task Role tiene un deny explícito al IMDS (`169.254.169.254`). Aunque un atacante logre ejecutar código en el container, no puede robar las credenciales del rol de EC2.

---

## Privacidad de datos

| Dato | Tratamiento |
|---|---|
| Audio del usuario | Procesado en memoria, nunca escrito a disco ni almacenado |
| Texto transcrito | Almacenado en `tickets.raw_input` (DB Supabase) |
| Contenido de tickets | Almacenado en Supabase con RLS |
| Tokens OAuth | Cifrados en Supabase Vault |
| API Keys | AWS Secrets Manager, solo accesibles al ECS Task |

El audio se envía a OpenAI Whisper API para transcripción. El texto resultante se envía a Anthropic Claude API para clasificación. Ambas APIs tienen políticas de privacidad propias — documentar esto en los términos de servicio de ebuddy antes de añadir usuarios reales.

---

## MoSCoW — Seguridad por fase

### Must Have (MVP actual)
- [x] JWT validado en cada request
- [x] RLS en todas las tablas de Supabase
- [x] Secrets Manager para credenciales en AWS
- [x] HTTPS/TLS 1.3 (ALB + ACM)
- [x] Security Groups restrictivos (solo ALB → ECS)
- [x] Audio no persistido
- [x] `userId` solo del JWT, nunca del cliente
- [x] Validación de inputs con Zod

### Should Have (antes de usuarios reales)
- [ ] Rate limiting por `userId` en API Routes
- [ ] Audit log de acciones críticas (login, delete ticket)
- [ ] Política de privacidad documentada para usuarios
- [ ] Rotación programada de API Keys (OpenAI, Anthropic)

### Could Have (Fase 2)
- [ ] WAF (AWS WAF en el ALB) para bloquear IPs maliciosas
- [ ] VPC Endpoints (tráfico a AWS APIs sin salir a internet)
- [ ] CloudTrail habilitado para audit completo de acciones AWS
- [ ] Escaneo de vulnerabilidades de imagen Docker en ECR (ya tiene scan on push)

### Won't Have (MVP)
- [ ] SOC 2 / ISO 27001 compliance formal
- [ ] Penetration testing externo
- [ ] Bug bounty program

---

## Checklist antes de ir a producción real

```
[ ] Cambiar NEXTAUTH_SECRET por un valor generado con openssl rand -base64 32
[ ] Rotar todas las API Keys (nueva key → cargar en Secrets Manager → verificar)
[ ] Activar Container Insights en ECS (costo adicional ~$5/mes)
[ ] Mover ECS a subnets privadas + agregar NAT Gateway
[ ] Agregar VPC Endpoints para ECR, Secrets Manager, CloudWatch Logs, S3
[ ] Activar deletion_protection en ALB (evitar borrado accidental)
[ ] Activar S3 access logs del ALB
[ ] Activar CloudTrail en la cuenta AWS
[ ] Revisar y actualizar políticas RLS en Supabase
[ ] Documentar política de privacidad para usuarios
[ ] Configurar alertas de costo en OpenAI y Anthropic dashboards
[ ] Hacer penetration test básico (OWASP Top 10)
```
