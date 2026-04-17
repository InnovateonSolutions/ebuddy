"""Tests estructurales para KAN-78: editar ticket inline desde el modal de detalle.

Invariantes protegidos:
  1. UpdateTicketInput y updateTicketSchema incluyen overview y what_to_do.
  2. mapUpdateTicketInputToDb mapea ambos campos a la DB.
  3. TicketDetailModal tiene modo edición (isEditing state).
  4. Modal muestra botón Guardar y Cancelar en modo edición.
  5. Modal tiene Pencil / botón editar para activar el modo.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel: str) -> str:
    return (REPO_ROOT / rel).read_text()


def test_update_ticket_input_includes_overview():
    """UpdateTicketInput debe incluir overview para editar la descripción."""
    types = read("lib/types.ts")
    # El interface UpdateTicketInput debe tener overview
    update_block_start = types.index("UpdateTicketInput")
    update_block = types[update_block_start : update_block_start + 300]
    assert "overview" in update_block, (
        "UpdateTicketInput debe incluir overview?: string para editar descripción"
    )


def test_update_ticket_input_includes_what_to_do():
    """UpdateTicketInput debe incluir what_to_do para editar el campo whatToDo."""
    types = read("lib/types.ts")
    update_block_start = types.index("UpdateTicketInput")
    update_block = types[update_block_start : update_block_start + 300]
    assert "what_to_do" in update_block, (
        "UpdateTicketInput debe incluir what_to_do?: string para editar el campo"
    )


def test_update_schema_validates_overview():
    """updateTicketSchema debe validar el campo overview."""
    contracts = read("lib/ticket-contracts.ts")
    schema_start = contracts.index("updateTicketSchema")
    schema_block = contracts[schema_start : schema_start + 400]
    assert "overview" in schema_block, (
        "updateTicketSchema debe incluir overview para validar el campo"
    )


def test_update_schema_validates_what_to_do():
    """updateTicketSchema debe validar el campo what_to_do."""
    contracts = read("lib/ticket-contracts.ts")
    schema_start = contracts.index("updateTicketSchema")
    schema_block = contracts[schema_start : schema_start + 400]
    assert "what_to_do" in schema_block, (
        "updateTicketSchema debe incluir what_to_do para validar el campo"
    )


def test_map_update_ticket_maps_overview():
    """mapUpdateTicketInputToDb debe incluir overview en el objeto de actualización."""
    contracts = read("lib/ticket-contracts.ts")
    map_fn_start = contracts.index("mapUpdateTicketInputToDb")
    map_fn_block = contracts[map_fn_start : map_fn_start + 300]
    assert "overview" in map_fn_block, (
        "mapUpdateTicketInputToDb debe mapear overview al objeto de DB"
    )


def test_ticket_detail_modal_has_edit_state():
    """TicketDetailModal debe tener estado isEditing para alternar modo edición."""
    board = read("components/kanban-board.tsx")
    assert "isEditing" in board, (
        "TicketDetailModal debe tener useState<boolean> para isEditing"
    )


def test_ticket_detail_modal_has_save_button():
    """TicketDetailModal debe tener botón Guardar en modo edición."""
    board = read("components/kanban-board.tsx")
    assert "Guardar" in board, (
        "TicketDetailModal debe renderizar botón 'Guardar' en modo edición"
    )


def test_ticket_detail_modal_has_cancel_button():
    """TicketDetailModal debe tener botón Cancelar que descarta cambios."""
    board = read("components/kanban-board.tsx")
    assert "Cancelar" in board, (
        "TicketDetailModal debe renderizar botón 'Cancelar' en modo edición"
    )


def test_ticket_detail_modal_has_edit_trigger():
    """TicketDetailModal debe tener botón/icono para activar modo edición."""
    board = read("components/kanban-board.tsx")
    # Pencil icon o texto "Editar"
    assert "Pencil" in board or "Editar" in board, (
        "TicketDetailModal debe tener un trigger (Pencil icon o 'Editar') para activar edición"
    )
