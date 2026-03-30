terraform {
  required_version = ">= 1.7.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
  }

  # State en DO Spaces (S3-compatible)
  # Antes del primer `terraform init`, crear el Space:
  #   doctl compute spaces create ebuddy-tfstate --region nyc3
  # Pasar credenciales con env vars (NO son el DO token — son Spaces keys):
  #   export AWS_ACCESS_KEY_ID=<spaces_access_key>
  #   export AWS_SECRET_ACCESS_KEY=<spaces_secret_key>
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

locals {
  name_prefix = "${var.app_name}-${var.environment}"
}
