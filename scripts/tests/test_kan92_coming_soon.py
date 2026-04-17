"""Tests estructurales KAN-92: componente ComingSoon para secciones incompletas."""
from pathlib import Path
REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_coming_soon_component_exists():
    assert (REPO_ROOT / "components" / "coming-soon.tsx").exists()

def test_coming_soon_accepts_title_and_description():
    src = read("components/coming-soon.tsx")
    assert "title" in src and "description" in src

def test_coming_soon_has_features_list():
    src = read("components/coming-soon.tsx")
    assert "features" in src

def test_coming_soon_shows_proximamente_label():
    src = read("components/coming-soon.tsx")
    assert "Próximamente" in src or "proximamente" in src.lower()

def test_horizonte_uses_coming_soon():
    src = read("app/(dashboard)/future/page.tsx")
    assert "ComingSoon" in src

def test_horizonte_has_friendly_description():
    src = read("app/(dashboard)/future/page.tsx")
    assert len(src) > 100
    assert "calendar" in src.lower() or "planif" in src.lower() or "agenda" in src.lower()
