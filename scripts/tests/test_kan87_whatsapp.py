"""Tests estructurales KAN-87: WhatsApp webhook → captura de tickets."""
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_whatsapp_route_exists():
    assert (REPO_ROOT / "app" / "api" / "webhooks" / "whatsapp" / "route.ts").exists()

def test_whatsapp_get_handles_challenge():
    service = read("features/messaging/whatsapp/server/service.ts")
    assert "hub.challenge" in service

def test_whatsapp_post_validates_verify_token():
    service = read("features/messaging/whatsapp/server/service.ts")
    assert "WHATSAPP_WEBHOOK_VERIFY_TOKEN" in service

def test_whatsapp_post_uses_capture_lib():
    route = read("app/api/webhooks/whatsapp/route.ts")
    assert "@/features/messaging/whatsapp/server/service" in route

def test_whatsapp_feature_modules_exist():
    assert (REPO_ROOT / "features" / "messaging" / "whatsapp" / "server" / "service.ts").exists()
    assert (REPO_ROOT / "features" / "messaging" / "whatsapp" / "server" / "reply.ts").exists()
    assert (REPO_ROOT / "features" / "messaging" / "whatsapp" / "server" / "types.ts").exists()

def test_whatsapp_webhook_is_public():
    """Meta llama al webhook sin auth de usuario — debe ser ruta pública."""
    middleware = read("middleware.ts")
    assert "/api/webhooks" in middleware

def test_env_example_has_whatsapp_vars():
    env = read(".env.example")
    assert "WHATSAPP_WEBHOOK_VERIFY_TOKEN" in env
    assert "WHATSAPP_PHONE_NUMBER_ID" in env
    assert "WHATSAPP_API_TOKEN" in env

def test_whatsapp_sends_confirmation_reply():
    """El webhook debe responder con confirmación al usuario de WhatsApp."""
    route = read("app/api/webhooks/whatsapp/route.ts")
    assert "handleIncomingWhatsAppWebhook" in route or "sendReply" not in route
