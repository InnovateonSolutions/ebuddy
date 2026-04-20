"""Tests estructurales para creación manual de tickets desde la UI."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_manual_ticket_contract_is_shared():
    shared_types = read("lib/types.ts")
    contracts = read("features/tickets/server/contracts.ts")

    assert "export interface CreateTicketInput" in shared_types, (
        "lib/types.ts debe exponer el contrato público para creación manual de tickets"
    )
    assert "createTicketSchema" in contracts, (
        "lib/ticket-contracts.ts debe validar el payload manual de creación"
    )
    assert "mapCreateTicketInputToDb" in contracts, (
        "lib/ticket-contracts.ts debe mapear el contrato público al schema de DB"
    )


def test_manual_ticket_route_is_thin_and_uses_shared_contract():
    route = read("app/api/tickets/route.ts")

    assert "getUserIdFromRequest" in route
    assert "createTicketSchema" in route, (
        "app/api/tickets/route.ts debe validar usando el contrato compartido"
    )
    assert "mapCreateTicketInputToDb" in route, (
        "app/api/tickets/route.ts debe mapear a DB desde el helper compartido"
    )
    assert ".insert(tickets)" in route, "el route debe persistir el ticket manual"
    assert "ClaudeAIService" not in route
    assert "WhisperTranscriptionService" not in route


def test_ticket_client_exposes_manual_create_mutation():
    ticket_client = read("features/tickets/server/client.ts")

    assert "export async function createTicket" in ticket_client, (
        "lib/ticket-client.ts debe exponer la mutación cliente para crear tickets manuales"
    )
    assert "fetch('/api/tickets'" in ticket_client or 'fetch("/api/tickets"' in ticket_client


def test_dashboard_exposes_manual_ticket_form():
    today_page = read("app/(dashboard)/today/page.tsx")
    day_view = read("features/tickets/components/day-view.tsx")
    manual_form = read("features/tickets/components/manual-ticket-form.tsx")

    assert "@/features/tickets/components/manual-ticket-form" in today_page or "@/features/tickets/components/manual-ticket-form" in day_view, (
        "La experiencia autenticada debe exponer un formulario manual de creación de tickets"
    )
    assert "Crear ticket" in manual_form, (
        "El formulario manual debe mostrar una CTA clara tipo Jira"
    )
    assert "Título" in manual_form
    assert "Contexto" in manual_form
    assert "Prioridad" in manual_form
    assert "createTicket(" in manual_form, (
        "El formulario manual debe usar la mutación cliente compartida"
    )
