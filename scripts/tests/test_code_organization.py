"""Tests estructurales para la reorganización de módulos compartidos.

Objetivo:
  - Reducir archivos pequeños o muertos.
  - Centralizar tipos y lógica repetida por dominio.
  - Mantener rutas y páginas delgadas.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_shared_domain_modules_exist():
    assert (REPO_ROOT / "lib" / "types.ts").exists(), "lib/types.ts debe concentrar los tipos compartidos"
    assert (REPO_ROOT / "lib" / "tickets.ts").exists(), "lib/tickets.ts debe concentrar queries y helpers de tickets"
    assert (REPO_ROOT / "lib" / "calendar.ts").exists(), "lib/calendar.ts debe concentrar la carga de eventos"


def test_routes_use_shared_calendar_module():
    today_route = read("app/api/tickets/today/route.ts")
    calendar_route = read("app/api/calendar/events/route.ts")

    assert "@/lib/calendar" in today_route, (
        "app/api/tickets/today/route.ts debe usar el módulo compartido lib/calendar.ts"
    )
    assert "@/lib/calendar" in calendar_route, (
        "app/api/calendar/events/route.ts debe usar el módulo compartido lib/calendar.ts"
    )
    assert "@/lib/calendar/google" not in today_route
    assert "@/lib/calendar/microsoft" not in today_route
    assert "@/lib/calendar/google" not in calendar_route
    assert "@/lib/calendar/microsoft" not in calendar_route


def test_pages_use_shared_ticket_module():
    today_page = read("app/(dashboard)/today/page.tsx")
    kanban_page = read("app/kanban/page.tsx")
    future_route = read("app/api/tickets/future/route.ts")

    assert "@/lib/tickets" in today_page, (
        "Today page debe delegar queries y agrupación a lib/tickets.ts"
    )
    assert "@/lib/tickets" in kanban_page, (
        "Kanban page debe delegar queries a lib/tickets.ts"
    )
    assert "@/lib/tickets" in future_route, (
        "Future route debe delegar paginación y timezone a lib/tickets.ts"
    )


def test_dead_or_single_use_wrappers_are_removed():
    assert not (REPO_ROOT / "hooks" / "use-realtime-tickets.ts").exists(), (
        "hooks/use-realtime-tickets.ts es una abstracción vacía y debe eliminarse"
    )
    assert not (REPO_ROOT / "components" / "calendar-event-item.tsx").exists(), (
        "calendar-event-item.tsx debe integrarse en day-view.tsx porque solo se usa ahí"
    )
    assert not (REPO_ROOT / "components" / "logout-button.tsx").exists(), (
        "logout-button.tsx debe integrarse en el layout porque solo se usa una vez"
    )


def test_legacy_types_files_are_removed():
    assert not (REPO_ROOT / "types" / "api.ts").exists(), (
        "types/api.ts debe consolidarse en lib/types.ts"
    )
    assert not (REPO_ROOT / "types" / "database.ts").exists(), (
        "types/database.ts debe consolidarse en lib/types.ts"
    )


def test_day_view_stops_importing_dead_wrappers():
    day_view = read("components/day-view.tsx")
    assert "useRealtimeTickets" not in day_view, (
        "day-view.tsx no debe depender de useRealtimeTickets tras eliminar la abstracción vacía"
    )
    assert "CalendarEventItem" not in day_view, (
        "day-view.tsx debe contener su renderer local de eventos de calendario"
    )


def test_ticket_contract_and_client_logic_are_centralized():
    shared_types = read("lib/types.ts")
    ticket_client = read("lib/ticket-client.ts")
    ticket_ui = read("lib/ticket-ui.ts")
    ticket_card = read("components/ticket-card.tsx")
    kanban_board = read("components/kanban-board.tsx")

    assert "due_date?: string | null" in shared_types, (
        "lib/types.ts debe definir el contrato público compartido para updates de ticket"
    )
    assert "export async function updateTicket" in ticket_client, (
        "lib/ticket-client.ts debe centralizar la mutación PATCH de tickets"
    )
    assert "export async function deleteTicket" in ticket_client, (
        "lib/ticket-client.ts debe centralizar la mutación DELETE de tickets"
    )
    assert "export const STATUS_CYCLE" in ticket_ui, (
        "lib/ticket-ui.ts debe concentrar constantes y helpers visuales de tickets"
    )
    assert "@/lib/ticket-client" in ticket_card
    assert "@/lib/ticket-client" in kanban_board
    assert "@/lib/ticket-ui" in ticket_card
    assert "@/lib/ticket-ui" in kanban_board
    assert "const STATUS_CYCLE" not in ticket_card
    assert "const STATUS_CYCLE" not in kanban_board


def test_ticket_update_route_uses_shared_public_contract():
    route = read("app/api/tickets/[id]/route.ts")

    assert "UpdateTicketInput" in route, (
        "El route handler debe depender del contrato compartido de update"
    )
    assert "dueDate:" not in route, (
        "El contrato público del route no debe mezclar camelCase con due_date"
    )


def test_capture_route_is_thin_and_delegates_business_logic():
    route = read("app/api/tickets/capture/route.ts")

    assert "@/lib/capture" in route, (
        "app/api/tickets/capture/route.ts debe delegar la lógica pesada a un módulo compartido"
    )
    assert "WhisperTranscriptionService" not in route, (
        "El route no debe instanciar el servicio de transcripción directamente"
    )
    assert "ClaudeAIService" not in route, (
        "El route no debe instanciar el servicio de IA directamente"
    )
    assert ".insert(tickets)" not in route, (
        "El route no debe persistir tickets directamente"
    )
