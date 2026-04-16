"""Tests estructurales para podar el visit counter global.

El contador ornamental no debe vivir en la ruta crítica de la app ni en los smoke
tests. Si en el futuro vuelve como analítica real, debe hacerlo fuera del layout
raíz y sin escritura transaccional por cada carga.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


# ── Middleware ────────────────────────────────────────────────────────────────

def test_visit_counter_route_is_not_public_anymore():
    middleware = (REPO_ROOT / "middleware.ts").read_text()
    assert "'/api/visits'" not in middleware and '"/api/visits"' not in middleware, (
        "/api/visits no debe seguir en PUBLIC_PATHS si el contador fue podado"
    )


def test_root_layout_does_not_mount_visit_counter():
    layout = (REPO_ROOT / "app" / "layout.tsx").read_text()
    assert "VisitCounter" not in layout, (
        "app/layout.tsx no debe montar VisitCounter globalmente"
    )


def test_visit_counter_component_and_route_are_removed():
    assert not (REPO_ROOT / "components" / "visit-counter.tsx").exists(), (
        "components/visit-counter.tsx debe eliminarse si el feature fue podado"
    )
    assert not (REPO_ROOT / "app" / "api" / "visits" / "route.ts").exists(), (
        "app/api/visits/route.ts debe eliminarse si el feature fue podado"
    )


def test_smoke_test_no_longer_depends_on_visit_counter():
    smoke = (REPO_ROOT / "scripts" / "e2e" / "smoke.sh").read_text()
    assert "/api/visits" not in smoke, (
        "scripts/e2e/smoke.sh no debe depender de /api/visits"
    )
