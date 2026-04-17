"""Tests KAN-93: force-dynamic en páginas async del dashboard."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_stats_has_force_dynamic():
    content = read("app/(dashboard)/stats/page.tsx")
    assert "export const dynamic = 'force-dynamic'" in content or \
           'export const dynamic = "force-dynamic"' in content

def test_settings_has_force_dynamic():
    content = read("app/(dashboard)/settings/page.tsx")
    assert "export const dynamic = 'force-dynamic'" in content or \
           'export const dynamic = "force-dynamic"' in content

def test_future_has_force_dynamic():
    content = read("app/(dashboard)/future/page.tsx")
    assert "export const dynamic = 'force-dynamic'" in content or \
           'export const dynamic = "force-dynamic"' in content
