# IAM — GitHub Actions → Route 53

Terraform necesita escribir en Route 53 para crear y actualizar el registro A de
`ebuddy.innovateoncorp.com`. Hay dos formas de darle esas credenciales a GitHub Actions.

---

## Comparativa: IAM User vs OIDC Federated Role

| | IAM User | OIDC Federated Role |
|---|---|---|
| Credentials en GitHub Secrets | Sí (larga duración) | No — token efímero por job |
| Rotación manual | Sí | No aplica |
| Blast radius si se filtra | Hasta que rotes | Ninguno — expiran solos |
| Complejidad de setup | Baja | Media (una vez) |
| Recomendación AWS para CI/CD | No | Sí |

**Recomendación: OIDC.** El setup es 10 minutos una sola vez y elimina credenciales
de larga duración de los secrets. Esta es la arquitectura actualmente en uso en este repo.

---

## Recursos IAM necesarios

| Archivo | Qué es |
|---|---|
| `route53-policy.json` | IAM Policy — permisos mínimos sobre Route 53 |
| `github-oidc-trust-policy.json` | Trust Policy del rol — quién puede asumirlo |

La política de permisos (`route53-policy.json`) permite:
- Listar hosted zones (necesario para que Terraform encuentre `innovateoncorp.com.`)
- Leer tags y modificar record sets dentro de cualquier zona (`hostedzone/*`)
- Leer el estado de un cambio (`change/*`)

Si quieres escopar a una sola zona, reemplaza `hostedzone/*` con el ARN exacto:
`arn:aws:route53:::hostedzone/Z1234567890ABC`

---

## Setup — pasos únicos en AWS

### 1. Crear el OIDC Provider (solo si no existe)

```bash
# Verificar si ya existe
aws iam list-open-id-connect-providers \
  | grep "token.actions.githubusercontent.com"

# Si no existe, crearlo
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

O desde la consola: IAM → Identity providers → Add provider → OpenID Connect →
URL: `https://token.actions.githubusercontent.com` · Audience: `sts.amazonaws.com`

### 2. Crear la IAM Policy

```bash
aws iam create-policy \
  --policy-name ebuddy-route53 \
  --policy-document file://docs/iam/route53-policy.json
```

Guarda el ARN que devuelve: `arn:aws:iam::ACCOUNT_ID:policy/ebuddy-route53`

### 3. Crear el IAM Role

Reemplaza `YOUR_AWS_ACCOUNT_ID` en `github-oidc-trust-policy.json` con tu account ID real,
luego:

```bash
aws iam create-role \
  --role-name github-actions-route53 \
  --assume-role-policy-document file://docs/iam/github-oidc-trust-policy.json

aws iam attach-role-policy \
  --role-name github-actions-route53 \
  --policy-arn arn:aws:iam::YOUR_AWS_ACCOUNT_ID:policy/ebuddy-route53
```

El rol resultante tiene este ARN:
`arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/github-actions-route53`

### 4. Agregar GitHub Variable (no Secret — el ARN no es sensible)

En GitHub → Settings → Secrets and variables → Actions → **Variables** (no Secrets):

```
Name:  AWS_ROUTE53_ROLE_ARN
Value: arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/github-actions-route53
```

---

## Cómo funciona en el pipeline

El workflow `terraform.yml` usa `aws-actions/configure-aws-credentials@v4` para asumir
el rol vía OIDC justo antes de `terraform init`. Las credenciales duran solo mientras
corre el job.

El conflict con DO Spaces (que también usa `AWS_ACCESS_KEY_ID` para el backend S3)
se resuelve pasando las credenciales de DO Spaces directamente a `terraform init -backend-config`
en lugar de variables de entorno.

```
Job de Terraform
├── configure-aws-credentials → asume github-actions-route53 → AWS_ACCESS_KEY_ID, etc.
├── terraform init -backend-config="access_key=DO_SPACES_KEY" → backend en DO Spaces
└── terraform apply → AWS provider usa las creds de OIDC (env vars) → Route 53
```

---

## Nota sobre Terraform local

Para correr Terraform localmente, configurar el perfil de AWS:

```bash
# ~/.aws/credentials o con aws configure
[default]
aws_access_key_id     = AKIA...
aws_secret_access_key = ...
region                = us-east-1
```

O exportar las variables de entorno. La `main.tf` ya no necesita pasar credentials
explícitas — el AWS provider usa la cadena de credenciales estándar.
