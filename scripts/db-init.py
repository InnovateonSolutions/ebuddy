#!/usr/bin/env python3
"""
Concatena las migraciones versionadas de Drizzle y escribe el SQL resultante
a stdout o al archivo especificado con --output.

Uso:
  python3 scripts/db-init.py --output /tmp/init.sql
  psql "$DATABASE_URL" -f /tmp/init.sql
"""

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = REPO_ROOT / "drizzle"


def list_migration_files() -> list[Path]:
    if not MIGRATIONS_DIR.exists():
        print(f"ERROR: directorio de migraciones no encontrado: {MIGRATIONS_DIR}", file=sys.stderr)
        sys.exit(1)

    migration_files = sorted(
        path
        for path in MIGRATIONS_DIR.glob("*.sql")
        if path.is_file()
    )

    if not migration_files:
        print(f"ERROR: no se encontraron migraciones SQL en {MIGRATIONS_DIR}", file=sys.stderr)
        sys.exit(1)

    return migration_files


def render_sql() -> str:
    parts = [
        "-- ─────────────────────────────────────────────────────────────",
        "-- Generado por scripts/db-init.py desde drizzle/*.sql",
        "-- NO editar manualmente — editar las migraciones versionadas",
        "-- ─────────────────────────────────────────────────────────────",
        "",
    ]

    for path in list_migration_files():
        parts.append(f"-- >>> {path.name}")
        parts.append(path.read_text(encoding="utf-8").strip())
        parts.append("")

    return "\n".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Concatena las migraciones SQL versionadas de Drizzle."
    )
    parser.add_argument(
        "--output", "-o",
        default="-",
        help="Archivo de salida (default: stdout)",
    )
    parser.add_argument(
        "--environment", "-e",
        default="prod",
        choices=["dev", "staging", "prod"],
        help="Compatibilidad temporal; no altera el SQL generado",
    )
    args = parser.parse_args()

    sql = render_sql()

    if args.output == "-":
        sys.stdout.write(sql)
    else:
        output_path = Path(args.output)
        output_path.write_text(sql, encoding="utf-8")
        output_path.chmod(0o600)
        print(f"✓ SQL renderizado en {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
