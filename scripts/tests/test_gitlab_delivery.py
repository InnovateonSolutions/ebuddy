from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text()


def test_route53_creates_gitlab_record_to_droplet_ip():
    dns = read("infra/terraform/dns.tf")
    assert 'resource "aws_route53_record" "gitlab"' in dns, (
        "Terraform debe crear un registro Route53 para gitlab.innovateoncorp.com"
    )
    assert "var.gitlab_domain_name" in dns, (
        "El registro de GitLab debe usar una variable dedicada y no hardcodear el nombre"
    )
    assert "digitalocean_reserved_ip.app.ip_address" in dns, (
        "GitLab publico debe entrar por el Droplet para que Caddy termine TLS"
    )


def test_route53_manages_resend_mail_domain_records():
    dns = read("infra/terraform/dns.tf")
    variables = read("infra/terraform/variables.tf")
    workflow = read(".github/workflows/old/terraform.yml")

    assert 'variable "gitlab_mail_domain_name"' in variables
    assert 'variable "gitlab_resend_dkim_public_key"' in variables
    assert 'resource "aws_route53_record" "gitlab_resend_dkim"' in dns
    assert 'resource "aws_route53_record" "gitlab_resend_mx"' in dns
    assert 'resource "aws_route53_record" "gitlab_resend_spf"' in dns
    assert 'resource "aws_route53_record" "gitlab_resend_tracking"' in dns
    assert "resend._domainkey.${var.gitlab_mail_domain_name}" in dns
    assert "send.${var.gitlab_mail_domain_name}" in dns
    assert "links.${var.gitlab_mail_domain_name}" in dns
    assert "feedback-smtp.us-east-1.amazonses.com" in dns
    assert "include:amazonses.com" in dns
    assert "links1.resend-dns.com" in dns
    assert "TF_VAR_gitlab_mail_domain_name=$GITLAB_SMTP_DOMAIN" in workflow
    assert "GITLAB_RESEND_DKIM_PUBLIC_KEY" in workflow


def test_terraform_exposes_gitlab_domain_variable_and_output():
    variables = read("infra/terraform/variables.tf")
    outputs = read("infra/terraform/outputs.tf")
    assert 'variable "gitlab_domain_name"' in variables
    assert 'output "gitlab_url"' in outputs


def test_main_env_declares_gitlab_domain_and_elitemini_ip():
    main_env = read("infra/config/main.env")
    assert "GITLAB_DOMAIN_NAME=gitlab.innovateoncorp.com" in main_env
    assert "ELITEMINI_TAILSCALE_IP=100.80.59.3" in main_env
    assert "GITLAB_SMTP_ADDRESS=smtp.resend.com" in main_env
    assert "GITLAB_SMTP_PORT=587" in main_env
    assert "GITLAB_SMTP_USERNAME=resend" in main_env
    assert "GITLAB_SMTP_DOMAIN=mail.innovateoncorp.com" in main_env
    assert "GITLAB_EMAIL_FROM=gitlab@mail.innovateoncorp.com" in main_env
    assert "GITLAB_EMAIL_REPLY_TO=martin.cuevas.t@gmail.com" in main_env


def test_caddyfile_exposes_gitlab_subdomain_and_proxies_to_elitemini():
    caddy = read("infra/caddy/Caddyfile")
    assert "gitlab.innovateoncorp.com" in caddy or "{$GITLAB_DOMAIN_NAME}" in caddy
    assert "reverse_proxy" in caddy
    assert "100.80.59.3:8929" in caddy or "{$ELITEMINI_TAILSCALE_IP}:8929" in caddy


def test_setup_workflow_passes_gitlab_external_url_to_ansible():
    workflow = read(".github/workflows/old/setup.yml")
    assert "gitlab_external_url" in workflow, (
        "setup.yml debe pasar gitlab_external_url al playbook para una instalacion reproducible"
    )
    assert "https://${GITLAB_DOMAIN_NAME}" in workflow or "https://gitlab.innovateoncorp.com" in workflow
    assert "RESEND_API_KEY" in workflow, (
        "setup.yml debe recibir RESEND_API_KEY desde GitHub Secrets para configurar SMTP en GitLab"
    )


def test_gitlab_role_configures_reverse_proxy_friendly_nginx_port():
    role = read("infra/ansible/roles/gitlab/tasks/main.yml")
    assert "nginx['listen_port']" in role, (
        "GitLab en elitemini debe escuchar en un puerto HTTP interno para el reverse proxy del Droplet"
    )
    assert "8929" in role, "El role debe fijar un puerto estable para el proxy publico"
    assert "nginx['listen_https'] = false" in role
    assert "smtp.resend.com" not in role, (
        "Los valores no sensibles de SMTP deben venir por variables, no hardcodeados dentro del role"
    )
    assert "smtp_password" in role and "resend_api_key" in role, (
        "El role debe mapear RESEND_API_KEY al campo smtp_password de GitLab"
    )


def test_ci_triggers_gitlab_setup_for_gitlab_ansible_changes():
    workflow = read(".github/workflows/old/ci.yml")
    assert "gitlab_changed" in workflow, (
        "CI debe distinguir cambios de GitLab para disparar el playbook correcto"
    )
    assert "playbook: install-gitlab" in workflow, (
        "CI debe invocar setup.yml con install-gitlab cuando cambie la automatizacion de GitLab"
    )


def test_deploy_writes_gitlab_proxy_env_to_droplet():
    deploy = read(".github/workflows/old/deploy.yml")
    assert "GITLAB_DOMAIN_NAME=gitlab.innovateoncorp.com" in deploy or "GITLAB_DOMAIN_NAME=$" in deploy
    assert "ELITEMINI_TAILSCALE_IP=100.80.59.3" in deploy or "ELITEMINI_TAILSCALE_IP=$" in deploy


def test_caddy_service_receives_env_file_for_gitlab_proxy_vars():
    compose = read("docker-compose.prod.yml")
    assert "caddy:" in compose
    assert "env_file: /opt/ebuddy/.env" in compose, (
        "Caddy debe recibir las variables del proxy de GitLab desde /opt/ebuddy/.env"
    )
