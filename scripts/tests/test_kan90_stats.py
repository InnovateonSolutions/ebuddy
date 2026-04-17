"""Tests estructurales KAN-90: página de estadísticas de productividad."""
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_stats_route_exists():
    assert (REPO_ROOT / "app" / "api" / "stats" / "route.ts").exists()

def test_stats_route_requires_auth():
    route = read("app/api/stats/route.ts")
    assert "auth()" in route or "getUserIdFromRequest" in route

def test_stats_page_exists():
    assert (REPO_ROOT / "app" / "(dashboard)" / "stats" / "page.tsx").exists()

def test_stats_page_has_auth_check():
    page = read("app/(dashboard)/stats/page.tsx")
    assert "auth()" in page and "redirect" in page

def test_stats_covers_weekly_completions():
    route = read("app/api/stats/route.ts")
    assert "DONE" in route and ("week" in route.lower() or "7" in route)

def test_stats_covers_context_distribution():
    route = read("app/api/stats/route.ts")
    assert "NEGOCIO" in route or "context" in route

def test_dashboard_nav_has_stats_link():
    layout = read("app/(dashboard)/layout.tsx")
    assert '"/stats"' in layout or "href=\"/stats\"" in layout
