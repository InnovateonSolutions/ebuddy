"""Tests estructurales para mantener una sola fuente de verdad del status."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_shared_status_module_exists():
    assert (REPO_ROOT / "features" / "status" / "server" / "service.ts").exists(), (
        "features/status/server/service.ts debe existir como fuente canónica de checks de estado"
    )
    assert (REPO_ROOT / "features" / "status" / "server" / "types.ts").exists()
    assert (REPO_ROOT / "lib" / "status.ts").exists(), (
        "lib/status.ts puede quedar como wrapper de compatibilidad mientras exista deuda legacy"
    )


def test_status_api_route_uses_shared_module():
    route = read("app/api/status/route.ts")
    assert "@/features/status/server/service" in route
    assert "getSystemStatus" in route
    assert "function checkAI" not in route
    assert "async function checkDatabase" not in route


def test_status_page_uses_shared_module():
    page = read("app/status/page.tsx")
    assert "@/features/status/server/service" in page
    assert "getSystemStatus" in page
    assert "function checkAI" not in page
    assert "async function checkDatabase" not in page
