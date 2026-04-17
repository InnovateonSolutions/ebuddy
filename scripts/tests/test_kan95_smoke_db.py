"""Tests KAN-95: health check con validación de DB."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_health_route_has_db_check():
    content = read("app/api/health/route.ts")
    assert "db" in content and ("SELECT" in content or "execute" in content or "sql" in content)

def test_health_route_returns_db_field():
    content = read("app/api/health/route.ts")
    assert "db:" in content or '"db"' in content

def test_health_route_is_force_dynamic():
    content = read("app/api/health/route.ts")
    assert "force-dynamic" in content

def test_smoke_checks_db_ok():
    content = read("scripts/e2e/smoke.sh")
    assert '"db":"ok"' in content or '"db": "ok"' in content
