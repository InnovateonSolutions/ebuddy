from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text()


def test_openclaw_webhook_exists():
    assert (REPO_ROOT / "app" / "api" / "webhooks" / "openclaw" / "route.ts").exists()


def test_openclaw_webhook_validates_hook_token():
    route = read("app/api/webhooks/openclaw/route.ts")
    assert "OPENCLAW_HOOK_TOKEN" in route
    assert "401" in route, "Debe rechazar requests sin token válido"


def test_openclaw_webhook_uses_capture_pipeline():
    route = read("app/api/webhooks/openclaw/route.ts")
    assert "createTicketFromCapturedInput" in route, (
        "Debe reutilizar el pipeline de captura existente"
    )


def test_openclaw_webhook_requires_text_field():
    route = read("app/api/webhooks/openclaw/route.ts")
    assert "body.text" in route or "text?" in route
    assert "400" in route, "Debe responder 400 si falta text"


def test_openclaw_webhook_returns_structured_response():
    route = read("app/api/webhooks/openclaw/route.ts")
    assert '"ok"' in route or "ok:" in route
    assert "message" in route, "Debe devolver message legible para relay a Slack"
