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


def test_prometheus_cpu_query_uses_idle_mode_not_non_idle():
    """La query de CPU debe basarse en mode="idle", no en mode!="idle".

    mode!="idle" incluye user, system, iowait, irq, softirq, steal, nice —
    7 modos × N cores. avg() divide entre todas esas series y subreporta
    el valor real (ej: 2% real → 0.0% mostrado en un nodo de 16 cores).

    mode="idle" tiene exactamente 1 serie por core; avg() da la fracción
    idle correcta y (1 - avg) es el uso real normalizado al 100%.
    """
    src = read("features/infra/server/prometheus-metrics.ts")
    assert 'mode="idle"' in src, (
        "La query de CPU debe filtrar mode=idle para evitar subreporte en nodos multi-core"
    )
    assert 'mode!="idle"' not in src, (
        "mode!=idle promedia demasiadas series y produce 0.0% en nodos con muchos cores"
    )


def test_infra_page_stays_force_dynamic():
    page = read("app/(dashboard)/infra/page.tsx")
    assert "export const dynamic = 'force-dynamic'" in page
