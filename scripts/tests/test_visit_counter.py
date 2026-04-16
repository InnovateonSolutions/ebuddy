"""Tests estructurales para el visit counter y su integración con el middleware.

Bug producción: VisitCounter llama POST /api/visits sin autenticación.
Middleware bloqueaba con 401 JSON sin campo 'count'. El componente hacía
setCount(undefined) → count === null era FALSE → undefined.toLocaleString() → crash.

Dos invariantes protegidas aquí:
  1. /api/visits debe estar en PUBLIC_PATHS del middleware (sin auth requerida).
  2. El componente debe usar typeof count !== 'number' para rechazar undefined.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


# ── Middleware ────────────────────────────────────────────────────────────────

def test_api_visits_is_public_path_in_middleware():
    """middleware.ts debe incluir /api/visits en PUBLIC_PATHS.

    El VisitCounter se renderiza en el root layout (todas las pantallas),
    incluyendo la página de login donde el usuario NO está autenticado.
    Sin este path en PUBLIC_PATHS, el middleware devuelve 401 JSON sin
    campo 'count', causando que el componente crashee con TypeError.
    """
    middleware = (REPO_ROOT / "middleware.ts").read_text()
    assert "'/api/visits'" in middleware or '"/api/visits"' in middleware, (
        "/api/visits debe estar en PUBLIC_PATHS de middleware.ts"
    )


# ── Componente ────────────────────────────────────────────────────────────────

def test_visit_counter_guards_against_non_number_count():
    """VisitCounter debe usar typeof count !== 'number', no count === null.

    Cuando la respuesta no tiene campo 'count', data.count es undefined.
    setCount(undefined) pone el estado en undefined.
    'undefined === null' es FALSE → el guard no detiene el render.
    'undefined.toLocaleString()' lanza TypeError → crash de React.

    El guard correcto: typeof count !== 'number' rechaza null Y undefined.
    """
    component = (REPO_ROOT / "components" / "visit-counter.tsx").read_text()
    assert "typeof count !== 'number'" in component, (
        "visit-counter.tsx debe usar 'typeof count !== 'number'' como guard, "
        "no 'count === null' (undefined !== null → crash)"
    )


def test_visit_counter_does_not_use_null_guard():
    """El guard count === null NO debe usarse en visit-counter.tsx.

    Este guard es insuficiente: undefined !== null, así que cuando
    data.count es undefined el render continúa y crashea.
    """
    component = (REPO_ROOT / "components" / "visit-counter.tsx").read_text()
    assert "count === null" not in component, (
        "visit-counter.tsx no debe usar 'count === null' — "
        "usa 'typeof count !== 'number'' en su lugar"
    )
