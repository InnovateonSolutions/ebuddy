"""Tests KAN-97: bottom navigation para móvil en PWA."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_bottom_nav_component_exists():
    assert (REPO_ROOT / "components" / "bottom-nav.tsx").exists()

def test_bottom_nav_hidden_on_desktop():
    content = read("components/bottom-nav.tsx")
    assert "sm:hidden" in content

def test_bottom_nav_has_all_routes():
    content = read("components/bottom-nav.tsx")
    for route in ["/today", "/future", "/kanban", "/stats", "/settings"]:
        assert route in content

def test_dashboard_layout_uses_bottom_nav():
    content = read("app/(dashboard)/layout.tsx")
    assert "BottomNav" in content or "bottom-nav" in content

def test_dashboard_layout_hides_top_nav_on_mobile():
    content = read("app/(dashboard)/layout.tsx")
    assert "hidden sm:flex" in content or "sm:flex" in content

def test_main_content_has_mobile_bottom_padding():
    content = read("app/(dashboard)/layout.tsx")
    assert "pb-" in content
