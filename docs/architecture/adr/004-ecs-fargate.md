# ADR 004 — DigitalOcean Droplet sobre AWS ECS Fargate

**Estado:** Aceptado (reemplaza la decisión original de ECS Fargate)
**Fecha:** Marzo 2026
**Autor:** Martín Cuevas Tavizón

---

## Contexto

El MVP de ebuddy requiere un entorno de compute para hospedar la app Next.js con las siguientes restricciones:

1. **Costo controlable** — MVP de validación personal debe costar < $20/mes.
2. **Sin Vercel** — evitar dependencia del modelo de precios de Vercel.
3. **Docker-native** — la app ya tiene `Dockerfile` multi-stage optimizado.
4. **Vendible como producto** — la infraestructura no debe imponer restricciones de uso comercial.
5. **Setup rápido** — un founder sin equipo DevOps dedicado debe poder operarlo.

La decisión original fue AWS ECS Fargate. Durante la implementación, se identificó que AWS añade complejidad operacional y costos fijos desproporcionados para un MVP de 1 usuario.

## Opciones evaluadas

| Plataforma | Setup | Costo MVP | Vendor lock-in | Uso comercial |
|---|---|---|---|---|
| **DigitalOcean Droplet (elegida)** | ~15 min | ~$16/mes | Bajo (Docker estándar) | Sin restricciones |
| AWS ECS Fargate (original) | ~2h (Terraform) | ~$31/mes | Medio (IAM, ECR, ECS) | Sin restricciones |
| Vercel | ~5 min | $20/mes+ | Alto (deploy model propietario) | Restricciones en free tier |
| Railway | ~5 min | $5/mes (suscripción) | Medio | Sin restricciones |
| Fly.io | ~10 min | Pay-as-you-go | Bajo | Sin restricciones |

## Decisión

**DigitalOcean Droplet `s-1vcpu-2gb` ($12/mes) + IP Reservada ($4/mes) + DOCR (gratis).**

### Por qué DigitalOcean sobre AWS ECS

1. **Costo:** DO cuesta ~$16/mes fijo. ECS + ALB en AWS costaba ~$31/mes (ALB = $18/mes solo por existir).
2. **Complejidad operacional:** ECS requiere VPC, subnets, IAM roles, ECR, ALB, Target Groups, Task Definitions, Secrets Manager. DO requiere un Droplet, un Firewall y un Registry.
3. **Caddy > ACM + ALB:** Caddy maneja HTTPS automático con Let's Encrypt sin configuración adicional. ACM requería validación DNS manual y el ALB cobra independientemente del tráfico.
4. **Terraform más simple:** El Terraform de DO tiene ~150 líneas vs ~600 líneas del Terraform de AWS.
5. **Sin lock-in crítico:** La app corre como Docker Compose estándar. Migrar a cualquier otra plataforma es copiar el Dockerfile y el docker-compose.

### Por qué no Railway o Fly.io

Railway requiere una suscripción mensual ($5/mes) que no es pay-as-you-go. Para vender el producto, la infraestructura debe ser completamente controlable y sin obligaciones de plataforma externas.

Fly.io es una buena alternativa pero requiere aprender su propio CLI y modelo de deploy. DigitalOcean tiene mejor documentación para este tipo de setup.

### Diferencia MVP vs Escala

| Componente | MVP actual | Si crece a +100 usuarios |
|---|---|---|
| Compute | `s-1vcpu-2gb` ($12/mes) | `s-2vcpu-4gb` ($24/mes) o varios Droplets |
| HTTPS | Caddy (1 instancia) | DO Load Balancer + múltiples Droplets |
| Registry | DOCR Starter (gratis) | DOCR Basic ($5/mes, sin límite) |
| DB | Supabase Cloud free | Supabase Cloud Pro ($25/mes) |

La migración de MVP a escala no requiere reescribir infraestructura — solo cambiar el tamaño del Droplet o agregar un Load Balancer.

## Consecuencias

**Positivas:**
- Costo dev: ~$16/mes (vs ~$31 en AWS, ~$65-90 en prod AWS).
- Operación simple: `ssh root@<ip> ebuddy-deploy` para desplegar.
- Caddy maneja TLS sin configuración manual.
- Sin sorpresas en la factura — costo fijo predecible.
- Propiedad total de la infraestructura.

**Negativas / Riesgos aceptados:**
- Un solo Droplet = SPOF (Single Point of Failure). Mitigado: DO SLA 99.99% para Droplets.
- Sin autoscaling automático. Aceptable para MVP de 1 usuario.
- SSH como mecanismo de deploy (en vez de ECS rolling update). Para MVP es suficiente.
- Sin locking en el Terraform state (DO Spaces no soporta DynamoDB-style locking). Mitigado: nunca correr `terraform apply` concurrentemente.

## Criterio de revisión

Cuando ebuddy tenga más de 10 usuarios activos simultáneos o el Droplet supere consistentemente el 70% de CPU/memoria, evaluar:
- Upgrade de tamaño de Droplet.
- Agregar DO Load Balancer + múltiples Droplets.
- O migrar a DO Kubernetes si la complejidad lo justifica.
