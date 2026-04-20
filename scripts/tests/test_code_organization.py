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
    assert (REPO_ROOT / "features" / "tickets" / "server" / "queries.ts").exists(), (
        "features/tickets/server/queries.ts debe ser la fuente canónica de tickets"
    )
    assert (REPO_ROOT / "features" / "calendar" / "server" / "index.ts").exists(), (
        "features/calendar/server/index.ts debe ser la fuente canónica de calendario"
    )
    assert (REPO_ROOT / "features" / "notifications" / "server" / "service.ts").exists(), (
        "features/notifications/server/service.ts debe centralizar la lógica de notificaciones"
    )
    assert (REPO_ROOT / "features" / "status" / "server" / "service.ts").exists(), (
        "features/status/server/service.ts debe ser la fuente canónica del status"
    )
    assert (REPO_ROOT / "features" / "messaging" / "whatsapp" / "server" / "service.ts").exists(), (
        "features/messaging/whatsapp/server/service.ts debe centralizar la lógica del webhook"
    )
    assert (REPO_ROOT / "lib" / "tickets.ts").exists(), "lib/tickets.ts debe mantenerse como wrapper compatible"
    assert (REPO_ROOT / "lib" / "calendar.ts").exists(), "lib/calendar.ts debe mantenerse como wrapper compatible"
    assert (REPO_ROOT / "lib" / "notifications.ts").exists(), "lib/notifications.ts debe mantenerse como wrapper compatible"
    assert (REPO_ROOT / "lib" / "status.ts").exists(), "lib/status.ts debe mantenerse como wrapper compatible"


def test_routes_use_shared_calendar_module():
    today_route = read("app/api/tickets/today/route.ts")
    calendar_route = read("app/api/calendar/events/route.ts")

    assert "@/features/calendar/server" in today_route, (
        "app/api/tickets/today/route.ts debe usar el módulo canónico de calendario"
    )
    assert "@/features/calendar/server" in calendar_route, (
        "app/api/calendar/events/route.ts debe usar el módulo canónico de calendario"
    )
    assert "@/features/calendar/server/google" not in today_route
    assert "@/features/calendar/server/microsoft" not in today_route
    assert "@/features/calendar/server/google" not in calendar_route
    assert "@/features/calendar/server/microsoft" not in calendar_route


def test_pages_use_shared_ticket_module():
    today_page = read("app/(dashboard)/today/page.tsx")
    kanban_page = read("app/(dashboard)/kanban/page.tsx")
    stats_page = read("app/(dashboard)/stats/page.tsx")
    future_route = read("app/api/tickets/future/route.ts")

    assert "@/features/tickets/server/queries" in today_page, (
        "Today page debe delegar queries y agrupación al módulo canónico de tickets"
    )
    assert "@/features/tickets/server/queries" in kanban_page, (
        "Kanban page debe delegar queries al módulo canónico de tickets"
    )
    assert "@/features/tickets/server/queries" in future_route, (
        "Future route debe delegar paginación y timezone al módulo canónico de tickets"
    )
    assert "@/features/tickets/server/queries" in stats_page, (
        "Stats page debe usar el módulo canónico de tickets en vez del wrapper legacy"
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
    day_view = read("features/tickets/components/day-view.tsx")
    assert "useRealtimeTickets" not in day_view, (
        "day-view canónico no debe depender de useRealtimeTickets tras eliminar la abstracción vacía"
    )
    assert "CalendarEventItem" not in day_view, (
        "day-view canónico debe contener su renderer local de eventos de calendario"
    )


def test_ticket_contract_and_client_logic_are_centralized():
    shared_types = read("lib/types.ts")
    ticket_client = read("features/tickets/server/client.ts")
    ticket_ui = read("features/tickets/server/ui.ts")
    ticket_card = read("features/tickets/components/ticket-card.tsx")
    kanban_board = read("features/tickets/components/kanban-board.tsx")

    assert "due_date?: string | null" in shared_types, (
        "lib/types.ts debe definir el contrato público compartido para updates de ticket"
    )
    assert "export async function updateTicket" in ticket_client, (
        "features/tickets/server/client.ts debe centralizar la mutación PATCH de tickets"
    )
    assert "export async function deleteTicket" in ticket_client, (
        "features/tickets/server/client.ts debe centralizar la mutación DELETE de tickets"
    )
    assert "export const STATUS_CYCLE" in ticket_ui, (
        "features/tickets/server/ui.ts debe concentrar constantes y helpers visuales de tickets"
    )
    assert "@/features/tickets/server/client" in ticket_card
    assert "@/features/tickets/server/client" in kanban_board
    assert "@/features/tickets/server/ui" in ticket_card
    assert "@/features/tickets/server/ui" in kanban_board
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

    assert "@/features/tickets/server/capture" in route, (
        "app/api/tickets/capture/route.ts debe delegar la lógica pesada al módulo canónico de tickets"
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
