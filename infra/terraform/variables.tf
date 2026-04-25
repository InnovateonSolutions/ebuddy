variable "do_token" {
  description = "Token de API personal de DigitalOcean (genera en https://cloud.digitalocean.com/account/api/tokens)"
  type        = string
  sensitive   = true
}

variable "do_region" {
  description = "Región de DigitalOcean"
  type        = string
  default     = "nyc3"
}

variable "app_name" {
  description = "Nombre de la aplicación (usado como prefijo en todos los recursos)"
  type        = string
  default     = "ebuddy"
}

variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment debe ser dev, staging o prod."
  }
}

variable "domain_name" {
  description = "Dominio de la app (ej: app.ebuddy.io) — debe estar apuntando a los nameservers de DO"
  type        = string
}

variable "gitlab_domain_name" {
  description = "Subdominio público para GitLab (ej: gitlab.ebuddy.io)"
  type        = string
}

variable "gitlab_mail_domain_name" {
  description = "Dominio usado como remitente SMTP de GitLab y verificado en Resend"
  type        = string
}

variable "gitlab_resend_dkim_public_key" {
  description = "Valor completo del TXT DKIM de Resend para gitlab_mail_domain_name, incluyendo el prefijo p="
  type        = string
  default     = ""
}

variable "enable_route53" {
  description = "Si es true, Terraform crea/actualiza el registro A en AWS Route 53"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email para alertas de monitoreo"
  type        = string
}

variable "ssh_pub_key" {
  description = "Llave SSH pública para acceder al Droplet (contenido del archivo .pub)"
  type        = string
}

variable "droplet_size" {
  description = "Tamaño del Droplet — ver opciones en: doctl compute size list"
  type        = string
  default     = "s-1vcpu-2gb" # $12/mes — suficiente para MVP
}

variable "registry_subscription_tier" {
  description = "Tier del DigitalOcean Container Registry"
  type        = string
  default     = "basic"
  validation {
    condition     = contains(["starter", "basic", "professional"], var.registry_subscription_tier)
    error_message = "registry_subscription_tier debe ser starter, basic o professional."
  }
}
