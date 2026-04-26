"""Tests estructurales para mantener un único camino operativo vigente."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_dockerfile_does_not_reference_supabase_build_args():
    dockerfile = read("Dockerfile")

    assert "NEXT_PUBLIC_SUPABASE_URL" not in dockerfile
    assert "NEXT_PUBLIC_SUPABASE_ANON_KEY" not in dockerfile
    assert "SUPABASE" not in dockerfile


def test_manual_deploy_script_matches_current_stack():
    deploy_script = read("scripts/deploy.sh")

    assert "DATABASE_URL" in deploy_script
    assert "AUTH_SECRET" in deploy_script
    assert "NEXT_PUBLIC_APP_URL" in deploy_script
    assert "SUPABASE" not in deploy_script


def test_bootstrap_assets_match_current_stack():
    bootstrap_script = read("scripts/bootstrap.sh")
    bootstrap_env_example = read(".bootstrap.env.example")

    for content in [bootstrap_script, bootstrap_env_example]:
        assert "DO_TOKEN" in content
        assert "DO_SPACES_ACCESS_KEY" in content
        assert "DO_SPACES_SECRET_KEY" in content
        assert "SUPABASE" not in content

    assert "DATABASE_URL" in bootstrap_env_example
    assert "AUTH_SECRET" in bootstrap_env_example
    assert "NEXT_PUBLIC_APP_URL" in bootstrap_env_example


def test_setup_secrets_and_env_example_match_current_stack():
    setup_secrets = read("scripts/setup-secrets.sh")
    env_example = read(".env.example")

    for content in [setup_secrets, env_example]:
        assert "DATABASE_URL" in content
        assert "AUTH_SECRET" in content
        assert "NEXT_PUBLIC_APP_URL" in content
        assert "SUPABASE" not in content


def test_runbook_does_not_describe_legacy_operational_paths():
    runbook = read("docs/operations/runbook.md")

    assert "Supabase" not in runbook
    assert "scripts/deploy.sh" not in runbook or "DigitalOcean" in runbook


def test_unique_environment_is_prod_across_operational_configs():
    main_env = read("infra/config/main.env")
    operations = read(".github/workflows/old/operations.yml")
    diagnose = read(".github/workflows/old/diagnose.yml")

    assert "ENVIRONMENT=prod" in main_env
    assert "DROPLET_NAME=ebuddy-prod-droplet" in main_env
    assert "ebuddy-dev-droplet" not in main_env
    assert "ebuddy-dev-droplet" not in operations
    assert "ebuddy-dev-droplet" not in diagnose
