"""Tests KAN-100: configuraciones base en Ajustes."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_preferences_api_route_exists():
    assert (REPO_ROOT / "app" / "api" / "user" / "preferences" / "route.ts").exists()

def test_preferences_api_accepts_put():
    content = read("app/api/user/preferences/route.ts")
    assert "PUT" in content or "PATCH" in content

def test_preferences_api_validates_timezone():
    content = read("app/api/user/preferences/route.ts")
    assert "timezone" in content

def test_preferences_api_validates_work_hours():
    content = read("app/api/user/preferences/route.ts")
    assert "workStart" in content or "work_start" in content

def test_preferences_form_component_exists():
    assert (REPO_ROOT / "components" / "preferences-form.tsx").exists()

def test_preferences_form_is_client():
    content = read("components/preferences-form.tsx")
    assert "'use client'" in content or '"use client"' in content

def test_settings_page_renders_preferences_form():
    content = read("app/(dashboard)/settings/page.tsx")
    assert "PreferencesForm" in content

def test_nav_does_not_have_duplicate_ajustes():
    content = read("app/(dashboard)/layout.tsx")
    nav_section = content[content.index("hidden sm:flex"):content.index("UserMenu")]
    assert "/settings" not in nav_section
