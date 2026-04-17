"""Tests KAN-96: notificación automática en fallo de deploy."""
from pathlib import Path
import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]

def load_deploy():
    return yaml.safe_load((REPO_ROOT / ".github/workflows/deploy.yml").read_text())

def test_build_job_has_failure_notification():
    deploy = load_deploy()
    steps = deploy["jobs"]["build"]["steps"]
    failure_steps = [s for s in steps if s.get("if") == "failure()"]
    assert len(failure_steps) >= 1, "build job debe tener al menos un step con if: failure()"

def test_deploy_job_has_failure_notification():
    deploy = load_deploy()
    steps = deploy["jobs"]["deploy"]["steps"]
    failure_steps = [s for s in steps if s.get("if") == "failure()"]
    assert len(failure_steps) >= 1, "deploy job debe tener al menos un step con if: failure()"

def test_failure_step_uses_whatsapp_token():
    deploy = load_deploy()
    full_yaml = (REPO_ROOT / ".github/workflows/deploy.yml").read_text()
    assert "WHATSAPP_API_TOKEN" in full_yaml
    assert "graph.facebook.com" in full_yaml or "WHATSAPP_PHONE_NUMBER_ID" in full_yaml
