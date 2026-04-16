terraform {
  required_version = ">= 1.7.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # State en DO Spaces (S3-compatible)
  # Antes del primer `terraform init`, crear el Space:
  #   doctl compute spaces create ebuddy-tfstate --region nyc3
  # Pasar credenciales DO Spaces vía -backend-config (NO env vars — esas las usa OIDC para AWS):
  #   terraform init \
  #     -backend-config="access_key=<spaces_access_key>" \
  #     -backend-config="secret_key=<spaces_secret_key>"
  backend "s3" {
    bucket = "ebuddy-tfstate"
    key    = "ebuddy/terraform.tfstate"
    region = "us-east-1" # requerido por el backend S3, ignorado por DO Spaces

    endpoints = {
      s3 = "https://nyc3.digitaloceanspaces.com"
    }

    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
  }
}

provider "digitalocean" {
  token = var.do_token
}

# AWS provider usa la cadena estándar de credenciales (env vars inyectadas por OIDC en CI,
# o perfil ~/.aws/credentials en local — ver docs/iam/README.md).
# Los skip_* evitan que el provider intente EC2 IMDS cuando no hay credenciales AWS
# (ej. cuando enable_route53=false y el step OIDC se omite en CI).
provider "aws" {
  region = "us-east-1"

  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
}

locals {
  name_prefix = "${var.app_name}-${var.environment}"
}
