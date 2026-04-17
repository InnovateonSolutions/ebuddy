"""Tests KAN-96: notificación automática en fallo de deploy."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_build_job_has_failure_notification():
    content = read(".github/workflows/deploy.yml")
    build_section = content[content.index("name: Build & Push"):content.index("name: Deploy to Droplet")]
    assert "if: failure()" in build_section

def test_deploy_job_has_failure_notification():
    content = read(".github/workflows/deploy.yml")
    deploy_section = content[content.index("name: Deploy to Droplet"):content.index("name: E2E Smoke Tests")]
    assert "if: failure()" in deploy_section

def test_failure_step_uses_whatsapp():
    content = read(".github/workflows/deploy.yml")
    assert "WHATSAPP_API_TOKEN" in content
    assert "graph.facebook.com" in content
