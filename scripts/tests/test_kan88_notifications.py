"""Tests estructurales KAN-88: notificaciones por email para tickets con fecha vencida."""
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_notifications_module_exists():
    assert (REPO_ROOT / "features" / "notifications" / "server" / "service.ts").exists()
    assert (REPO_ROOT / "features" / "notifications" / "server" / "due-tickets-email.ts").exists()
    assert not (REPO_ROOT / "lib" / "notifications.ts").exists()

def test_notifications_exports_send_function():
    lib = read("features/notifications/server/due-tickets-email.ts")
    assert "sendDueTicketsEmail" in lib

def test_notifications_uses_resend():
    lib = read("features/notifications/server/due-tickets-email.ts")
    assert "resend" in lib.lower() or "Resend" in lib

def test_cron_notifications_route_exists():
    assert (REPO_ROOT / "app" / "api" / "cron" / "due-notifications" / "route.ts").exists()

def test_cron_route_validates_secret():
    route = read("app/api/cron/due-notifications/route.ts")
    assert "CRON_SECRET" in route
    assert "@/features/notifications/server/service" in route

def test_env_example_has_cron_secret():
    env = read(".env.example")
    assert "CRON_SECRET" in env

def test_operations_yml_has_notification_cron():
    ops = read(".github/workflows/old/operations.yml")
    assert "due-notifications" in ops or "notify" in ops
