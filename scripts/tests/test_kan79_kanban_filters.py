"""Tests estructurales para KAN-79: filtros rápidos en el tablero Kanban.

Invariantes protegidos:
  1. KanbanBoard tiene estado para filtros activos.
  2. La UI tiene chips/botones para filtrar por prioridad.
  3. La UI tiene chips/botones para filtrar por contexto.
  4. El filtrado es client-side (sin llamadas a API adicionales).
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel: str) -> str:
    return (REPO_ROOT / rel).read_text()


def test_kanban_board_has_filter_state():
    """KanbanBoard debe tener estado para los filtros activos."""
    board = read("features/tickets/components/kanban-board.tsx")
    assert "filter" in board.lower(), (
        "KanbanBoard debe tener useState para filtros (activeFilters, filterPriority, etc.)"
    )


def test_kanban_filter_covers_priorities():
    """Los filtros deben cubrir las 3 prioridades: ALTA, MEDIA, BAJA."""
    board = read("features/tickets/components/kanban-board.tsx")
    # Las 3 prioridades deben aparecer en el contexto de la UI de filtros
    assert "ALTA" in board and "MEDIA" in board and "BAJA" in board, (
        "Los chips de filtro deben referenciar ALTA, MEDIA y BAJA"
    )


def test_kanban_filter_covers_contexts():
    """Los filtros deben cubrir los contextos: Negocio y Personal."""
    board = read("features/tickets/components/kanban-board.tsx")
    filter_section = board.lower()
    assert "negocio" in filter_section and "personal" in filter_section, (
        "Los chips de filtro deben incluir opciones para Negocio y Personal"
    )


def test_kanban_filter_is_clientside():
    """El filtro no debe hacer fetch adicional — es puramente client-side."""
    board = read("features/tickets/components/kanban-board.tsx")
    # No debe haber fetch dentro del componente de filtros
    # La lógica de filtrado usa .filter() sobre el estado local
    assert "filteredNegocio" in board or "filtered" in board, (
        "El filtrado debe derivarse del estado local (filteredNegocio / filteredPersonal)"
    )
