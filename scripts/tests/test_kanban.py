"""Tests estructurales para KAN-63: Kanban board con drag & drop y datos reales.

Invariantes protegidos:
  1. PATCH endpoint acepta status=QA (sin esto el estado QA no puede moverse).
  2. /kanban no está en PUBLIC_PATHS — requiere autenticación.
  3. La página kanban carga datos reales (auth + DB, no mock).
  4. @dnd-kit/core está en las dependencias del proyecto.
  5. kanban-board.tsx importa de @dnd-kit (drag & drop implementado).
  6. La nav del dashboard tiene link al tablero Kanban.
"""

from pathlib import Path
import json

REPO_ROOT = Path(__file__).resolve().parents[2]


# ── API ──────────────────────────────────────────────────────────────────────

def test_patch_endpoint_accepts_qa_status():
    """PATCH /api/tickets/:id debe aceptar status=QA.

    El tablero Kanban tiene 4 columnas: PENDING, IN_PROGRESS, QA, DONE.
    Sin 'QA' en el contrato compartido de validación, mover un ticket a la
    columna QA falla con error de validación.
    """
    route = (REPO_ROOT / "app" / "api" / "tickets" / "[id]" / "route.ts").read_text()
    contracts = (REPO_ROOT / "features" / "tickets" / "server" / "contracts.ts").read_text()
    assert "@/features/tickets/server/contracts" in route, (
        "PATCH /api/tickets/:id debe usar el contrato compartido de tickets"
    )
    assert "'QA'" in contracts or '"QA"' in contracts, (
        "El contrato compartido de update de tickets debe incluir 'QA' en el enum de status"
    )


# ── Autenticación ────────────────────────────────────────────────────────────

def test_kanban_not_in_public_paths():
    """/kanban debe requerir autenticación — no debe estar en PUBLIC_PATHS.

    La vista Kanban muestra y permite modificar tickets reales del usuario.
    Si permanece en PUBLIC_PATHS, cualquier visitante sin sesión puede
    intentar acceder; el middleware no redirige al login.
    """
    middleware = (REPO_ROOT / "middleware.ts").read_text()
    assert "'/kanban'" not in middleware and '"/kanban"' not in middleware, (
        "/kanban no debe estar en PUBLIC_PATHS — debe requerir auth"
    )


def test_kanban_page_has_auth_check():
    """app/(dashboard)/kanban/page.tsx debe verificar la sesión antes de cargar datos.

    Cuando el middleware redirige al login (sin auth), la página no se
    renderiza. Pero la página también debe protegerse a sí misma con
    redirect() por si el middleware falla o el path se reutiliza en tests.
    """
    page = (REPO_ROOT / "app" / "(dashboard)" / "kanban" / "page.tsx").read_text()
    assert "auth()" in page, "kanban/page.tsx debe llamar a auth()"
    assert "redirect" in page, "kanban/page.tsx debe redirigir si no hay sesión"


def test_kanban_page_loads_real_data():
    """La página Kanban debe cargar tickets reales de la DB, no mock data.

    La versión anterior usaba MOCK_NEGOCIO y MOCK_PERSONAL hardcodeados.
    Con datos reales, la página consulta la DB directamente o delega en
    un módulo compartido de tickets que use Drizzle ORM.
    """
    page = (REPO_ROOT / "app" / "(dashboard)" / "kanban" / "page.tsx").read_text()
    assert "MOCK_NEGOCIO" not in page and "MOCK_PERSONAL" not in page, (
        "kanban/page.tsx no debe usar datos mock — debe cargar desde la DB"
    )
    assert "db" in page or "drizzle" in page.lower() or "@/features/tickets/server/queries" in page, (
        "kanban/page.tsx debe cargar datos reales, ya sea directo con Drizzle o via el módulo canónico de tickets"
    )


def test_kanban_page_not_readonly():
    """La página Kanban autenticada no debe pasar readonly={true}.

    readonly={true} desactiva todas las interacciones. Con datos reales
    y usuario autenticado, el tablero debe ser completamente interactivo.
    """
    page = (REPO_ROOT / "app" / "(dashboard)" / "kanban" / "page.tsx").read_text()
    assert "readonly={true}" not in page, (
        "kanban/page.tsx no debe pasar readonly={{true}} — el tablero debe ser interactivo"
    )


# ── Drag & Drop ──────────────────────────────────────────────────────────────

def test_dnd_kit_in_package_json():
    """@dnd-kit/core debe estar en las dependencias del proyecto.

    Es la librería que implementa el drag & drop en el tablero Kanban.
    """
    pkg = json.loads((REPO_ROOT / "package.json").read_text())
    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    assert "@dnd-kit/core" in deps, (
        "@dnd-kit/core debe estar en package.json dependencies"
    )


def test_kanban_board_uses_dnd_kit():
    """kanban-board.tsx debe importar de @dnd-kit para drag & drop.

    Sin esta importación, el drag & drop no está implementado.
    """
    board = (REPO_ROOT / "features" / "tickets" / "components" / "kanban-board.tsx").read_text()
    assert "@dnd-kit" in board, (
        "kanban-board.tsx debe importar de @dnd-kit/core para implementar drag & drop"
    )


def test_kanban_board_has_dnd_context():
    """kanban-board.tsx debe usar DndContext de @dnd-kit/core.

    DndContext es el provider que habilita el drag & drop en toda la board.
    Sin él, los componentes useDraggable/useDroppable no funcionan.
    """
    board = (REPO_ROOT / "features" / "tickets" / "components" / "kanban-board.tsx").read_text()
    assert "DndContext" in board, (
        "kanban-board.tsx debe usar <DndContext> para habilitar drag & drop"
    )


def test_kanban_board_has_droppable_columns():
    """kanban-board.tsx debe usar useDroppable para las columnas.

    Cada columna (PENDING, IN_PROGRESS, QA, DONE) debe ser un target
    de drop para que los tickets puedan ser arrastrados entre columnas.
    """
    board = (REPO_ROOT / "features" / "tickets" / "components" / "kanban-board.tsx").read_text()
    assert "useDroppable" in board, (
        "kanban-board.tsx debe usar useDroppable para convertir columnas en targets de drop"
    )


def test_kanban_board_has_draggable_cards():
    """kanban-board.tsx debe usar useDraggable para las tarjetas.

    Sin useDraggable, las tarjetas no pueden ser arrastradas.
    """
    board = (REPO_ROOT / "features" / "tickets" / "components" / "kanban-board.tsx").read_text()
    assert "useDraggable" in board, (
        "kanban-board.tsx debe usar useDraggable para que las tarjetas sean arrastrables"
    )


# ── Navegación ───────────────────────────────────────────────────────────────

def test_dashboard_nav_has_kanban_link():
    """El layout del dashboard debe tener un link al tablero Kanban (/kanban).

    Sin este link, el usuario autenticado no tiene forma de navegar
    al tablero desde las otras vistas del dashboard.
    """
    layout = (REPO_ROOT / "app" / "(dashboard)" / "layout.tsx").read_text()
    assert '"/kanban"' in layout or "'/kanban'" in layout or 'href="/kanban"' in layout, (
        "app/(dashboard)/layout.tsx debe incluir un link href='/kanban'"
    )
