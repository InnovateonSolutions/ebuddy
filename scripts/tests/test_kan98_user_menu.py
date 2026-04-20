"""Tests KAN-98: dropdown de perfil con Ajustes y Salir."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_user_menu_component_exists():
    assert (REPO_ROOT / "features" / "navigation" / "components" / "user-menu.tsx").exists()

def test_user_menu_has_settings_link():
    content = read("features/navigation/components/user-menu.tsx")
    assert "/settings" in content

def test_user_menu_has_logout():
    content = read("features/navigation/components/user-menu.tsx")
    assert "logoutAction" in content or "signOut" in content

def test_user_menu_is_client_component():
    content = read("features/navigation/components/user-menu.tsx")
    assert "'use client'" in content or '"use client"' in content

def test_dashboard_layout_uses_user_menu():
    content = read("app/(dashboard)/layout.tsx")
    assert "UserMenu" in content
