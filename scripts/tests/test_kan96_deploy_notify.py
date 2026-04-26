"""Tests KAN-96: notificación automática en fallo de deploy."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_build_job_has_failure_notification():
    content = read(".github/workflows/old/deploy.yml")
    build_section = content[content.index("name: Build & Push"):content.index("name: Deploy to Droplet")]
    assert "if: failure()" in build_section

def test_deploy_job_has_failure_notification():
    content = read(".github/workflows/old/deploy.yml")
    deploy_section = content[content.index("name: Deploy to Droplet"):content.index("name: E2E Smoke Tests")]
    assert "if: failure()" in deploy_section

def test_failure_step_uses_notify_script():
    deploy = read(".github/workflows/old/deploy.yml")
    # La lógica de notificación vive en el script, el workflow lo invoca
    assert "WHATSAPP_API_TOKEN" in deploy
    assert "notify-whatsapp.py" in deploy

def test_notify_script_calls_whatsapp_api():
    script = read("scripts/notify-whatsapp.py")
    assert "graph.facebook.com" in script
    assert "--stage" in script
