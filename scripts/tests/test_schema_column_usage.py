"""Verifica que las columnas usadas en las páginas del dashboard existen en el schema de Drizzle.
Detecta el bug 'column X does not exist' antes del deploy.
"""
from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parents[2]

def schema_columns():
    schema = (REPO_ROOT / "lib" / "db" / "schema.ts").read_text()
    # extrae pares (tsName, sqlName) de patrones como: tsName: tipo('sql_name')
    pairs = re.findall(r"(\w+):\s*\w+\(['\"](\w+)['\"]", schema)
    return {ts: sql for ts, sql in pairs}

def columns_used_in_select(path: str):
    content = (REPO_ROOT / path).read_text()
    # solo columnas dentro de bloques .select({ key: table.col }) — patrón Drizzle explícito
    # captura: userPreferences.colName o calendarTokens.colName
    SKIP = {'from','where','then','select','insert','update','delete','values',
            'set','eq','and','or','gte','lte','ne','userId','id','target'}
    raw = set(re.findall(
        r'(?:userPreferences|calendarTokens)\s*\.\s*([a-z][a-zA-Z]+)',
        content
    ))
    return raw - SKIP

def test_settings_page_columns_exist_in_schema():
    cols = schema_columns()
    used = columns_used_in_select("app/(dashboard)/settings/page.tsx")
    for col in used:
        assert col in cols, f"Column '{col}' used in settings/page.tsx pero no existe en schema.ts"

def test_stats_page_columns_exist_in_schema():
    cols = schema_columns()
    used = columns_used_in_select("app/(dashboard)/stats/page.tsx")
    for col in used:
        assert col in cols, f"Column '{col}' used in stats/page.tsx pero no existe en schema.ts"

def test_dashboard_pages_have_force_dynamic():
    pages = [
        "app/(dashboard)/today/page.tsx",
        "app/(dashboard)/campaigns/page.tsx",
        "app/(dashboard)/stats/page.tsx",
        "app/(dashboard)/settings/page.tsx",
    ]
    for page in pages:
        content = (REPO_ROOT / page).read_text()
        assert "force-dynamic" in content, f"{page} debe tener export const dynamic = 'force-dynamic'"
