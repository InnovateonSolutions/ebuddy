"""Tests estructurales para mantener una fuente de verdad de GitHub Secrets."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_github_secrets_doc_exists():
    assert (REPO_ROOT / "docs" / "infrastructure" / "github-actions-secrets.md").exists(), (
        "Debe existir una fuente de verdad para los GitHub Actions secrets del repo"
    )


def test_setup_secrets_script_mentions_monitoring_and_runtime_integrations():
    script = read("scripts/setup-secrets.sh")

    for secret in [
        "DO_MONITORING_TOKEN",
        "CRON_SECRET",
        "OPENCLAW_BASE_URL",
        "OPENCLAW_HOOK_TOKEN",
        "OPENCLAW_GATEWAY_TOKEN",
        "OLLAMA_BASE_URL",
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_API_TOKEN",
        "WHATSAPP_OWNER_USER_ID",
    ]:
        assert secret in script, f"scripts/setup-secrets.sh debe contemplar {secret}"


def test_bootstrap_env_example_mentions_extended_secret_set():
    env_example = read(".bootstrap.env.example")

    for secret in [
        "DO_MONITORING_TOKEN",
        "CRON_SECRET",
        "TAILSCALE_AUTH_KEY",
        "ELITEMINI_SSH_KEY",
        "OLLAMA_BASE_URL",
        "OPENCLAW_BASE_URL",
        "OPENCLAW_HOOK_TOKEN",
        "OPENCLAW_GATEWAY_TOKEN",
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_API_TOKEN",
        "WHATSAPP_OWNER_USER_ID",
    ]:
        assert secret in env_example, f".bootstrap.env.example debe documentar {secret}"


def test_github_secrets_doc_tracks_ci_cd_requirements():
    doc = read("docs/infrastructure/github-actions-secrets.md")

    for secret in [
        "DO_TOKEN",
        "DO_SSH_PRIVATE_KEY",
        "DO_MONITORING_TOKEN",
        "DATABASE_URL",
        "AUTH_SECRET",
        "CRON_SECRET",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "OPENCLAW_BASE_URL",
        "WHATSAPP_API_TOKEN",
    ]:
        assert secret in doc, f"La documentación de GitHub secrets debe incluir {secret}"
