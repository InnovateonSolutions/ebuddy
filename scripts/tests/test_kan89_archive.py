"""Tests estructurales KAN-89: archivar y purgar tickets DONE viejos en bulk."""
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_schema_has_archived_column():
    schema = read("lib/db/schema.ts")
    assert "archived" in schema

def test_migration_adds_archived_column():
    migrations = list((REPO_ROOT / "drizzle").glob("*.sql"))
    found = any("archived" in m.read_text() for m in migrations)
    assert found, "Debe existir una migración que añada la columna archived"

def test_tickets_lib_excludes_archived():
    lib = read("features/tickets/server/queries.ts")
    assert "archived" in lib, "Todas las queries deben excluir tickets archivados"

def test_archive_done_route_exists():
    assert (REPO_ROOT / "app" / "api" / "tickets" / "archive-done" / "route.ts").exists()

def test_archive_done_route_requires_auth():
    route = read("app/api/tickets/archive-done/route.ts")
    assert "getUserIdFromRequest" in route

def test_kanban_has_archive_button():
    board = read("features/tickets/components/kanban-board.tsx")
    assert "Archivar" in board
