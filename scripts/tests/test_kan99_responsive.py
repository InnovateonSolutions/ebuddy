"""Tests KAN-99: diseño responsive en páginas del dashboard."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_settings_calendar_rows_wrap_on_mobile():
    content = read("app/(dashboard)/settings/page.tsx")
    # calendar rows must allow wrapping on mobile
    assert "flex-wrap" in content or "flex-col" in content

def test_settings_connect_button_mobile_tap_target():
    content = read("app/(dashboard)/settings/page.tsx")
    # button must have at least py-2 or py-2.5 for adequate touch target
    assert "py-2" in content

def test_kanban_filter_buttons_tap_target():
    content = read("features/tickets/components/kanban-board.tsx")
    # filter buttons need py-2 minimum
    assert "py-2" in content

def test_stats_highlight_cards_responsive():
    content = read("app/(dashboard)/stats/page.tsx")
    assert "grid-cols-2" in content and "sm:grid-cols-4" in content

def test_settings_has_responsive_calendar_layout():
    content = read("app/(dashboard)/settings/page.tsx")
    # calendar provider row: info on top, button below on mobile
    assert "sm:flex-row" in content or "flex-col sm:" in content

def test_dashboard_layout_uses_shared_shell_classes():
    content = read("app/(dashboard)/layout.tsx")
    assert "dashboard-shell" in content
    assert "dashboard-topbar" in content

def test_primary_dashboard_pages_use_shared_hero():
    for path in [
        "app/(dashboard)/today/page.tsx",
        "app/(dashboard)/kanban/page.tsx",
        "app/(dashboard)/stats/page.tsx",
        "app/(dashboard)/settings/page.tsx",
    ]:
        content = read(path)
        assert "dashboard-hero" in content
