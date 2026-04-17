"""Tests estructurales KAN-86: búsqueda de tickets por texto libre."""
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_search_tickets_function_exists():
    lib = read("lib/tickets.ts")
    assert "searchTickets" in lib

def test_search_tickets_uses_ilike():
    lib = read("lib/tickets.ts")
    assert "ilike" in lib

def test_search_tickets_limits_to_20():
    lib = read("lib/tickets.ts")
    idx = lib.index("searchTickets")
    block = lib[idx:idx+400]
    assert ".limit(20)" in block or "SEARCH_LIMIT" in block

def test_search_route_exists():
    assert (REPO_ROOT / "app" / "api" / "tickets" / "search" / "route.ts").exists()

def test_search_route_requires_auth():
    route = read("app/api/tickets/search/route.ts")
    assert "getUserIdFromRequest" in route or "userId" in route

def test_search_component_exists():
    assert (REPO_ROOT / "components" / "search-command.tsx").exists()

def test_search_component_has_debounce():
    comp = read("components/search-command.tsx")
    assert "300" in comp or "debounce" in comp.lower() or "setTimeout" in comp

def test_dashboard_layout_mounts_search():
    layout = read("app/(dashboard)/layout.tsx")
    assert "SearchCommand" in layout
