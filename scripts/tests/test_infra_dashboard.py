"""Tests estructurales para la nueva arquitectura de Infra."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text()


def test_infra_page_uses_shared_service_not_self_fetch():
    page = read("app/(dashboard)/infra/page.tsx")
    assert "getInfraSnapshot" in page
    assert "/api/infra/metrics" not in page


def test_infra_service_modules_exist():
    assert (REPO_ROOT / "features" / "infra" / "server" / "service.ts").exists()
    assert (REPO_ROOT / "features" / "infra" / "server" / "do-metrics.ts").exists()
    assert (REPO_ROOT / "features" / "infra" / "server" / "prometheus-metrics.ts").exists()
    assert (REPO_ROOT / "features" / "infra" / "server" / "app-metrics.ts").exists()


def test_infra_page_stays_force_dynamic():
    page = read("app/(dashboard)/infra/page.tsx")
    assert "export const dynamic = 'force-dynamic'" in page
