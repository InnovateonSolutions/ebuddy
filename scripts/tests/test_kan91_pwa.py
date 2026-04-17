"""Tests estructurales KAN-91: PWA instalable en Android e iOS."""
from pathlib import Path, PurePosixPath
import json
REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_manifest_exists():
    """Debe existir un manifest (Next.js manifest.ts o public/manifest.json)."""
    next_manifest = REPO_ROOT / "app" / "manifest.ts"
    static_manifest = REPO_ROOT / "public" / "manifest.json"
    assert next_manifest.exists() or static_manifest.exists(), \
        "Debe existir app/manifest.ts o public/manifest.json"

def test_manifest_has_required_fields():
    next_manifest = REPO_ROOT / "app" / "manifest.ts"
    static_manifest = REPO_ROOT / "public" / "manifest.json"

    if next_manifest.exists():
        content = next_manifest.read_text()
        assert "name" in content
        assert "start_url" in content
        assert "standalone" in content
        assert "icons" in content
    else:
        data = json.loads(static_manifest.read_text())
        assert "name" in data
        assert "start_url" in data
        assert data.get("display") == "standalone"
        assert "icons" in data

def test_pwa_icons_exist():
    icons_192 = REPO_ROOT / "public" / "icon-192.png"
    icons_512 = REPO_ROOT / "public" / "icon-512.png"
    assert icons_192.exists(), "Debe existir public/icon-192.png"
    assert icons_512.exists(), "Debe existir public/icon-512.png"

def test_root_layout_has_apple_meta():
    layout = read("app/layout.tsx")
    assert "apple-mobile-web-app" in layout or "apple-touch-icon" in layout
