#!/usr/bin/env python3
"""
Renderiza db/init.sql.j2 con Jinja2 y escribe el SQL resultante a stdout
o al archivo especificado con --output.

Uso:
  # Renderizar para producción (sin seed data):
  ENVIRONMENT=prod python3 scripts/db-init.py --output /tmp/init.sql
  psql "$DATABASE_URL" -f /tmp/init.sql

  # Renderizar para desarrollo (incluye seed data):
  ENVIRONMENT=dev python3 scripts/db-init.py | psql "$DATABASE_URL"
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from jinja2 import Environment, FileSystemLoader, StrictUndefined, TemplateNotFound
except ImportError:
    print("ERROR: jinja2 no está instalado. Ejecuta: pip install jinja2", file=sys.stderr)
    sys.exit(1)

REPO_ROOT   = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "db"
TEMPLATE_FILE = "init.sql.j2"


def render_sql(environment: str) -> str:
    if not (TEMPLATE_DIR / TEMPLATE_FILE).exists():
        print(f"ERROR: template no encontrado: {TEMPLATE_DIR / TEMPLATE_FILE}", file=sys.stderr)
        sys.exit(1)

    jinja_env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
    )

    try:
        template = jinja_env.get_template(TEMPLATE_FILE)
    except TemplateNotFound:
        print(f"ERROR: {TEMPLATE_FILE} no encontrado en {TEMPLATE_DIR}", file=sys.stderr)
        sys.exit(1)

    return template.render(environment=environment)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Renderiza db/init.sql.j2 con variables de entorno."
    )
    parser.add_argument(
        "--output", "-o",
        default="-",
        help="Archivo de salida (default: stdout)",
    )
    parser.add_argument(
        "--environment", "-e",
        default=os.environ.get("ENVIRONMENT", "prod"),
        choices=["dev", "staging", "prod"],
        help="Entorno de despliegue (default: $ENVIRONMENT o 'prod')",
    )
    args = parser.parse_args()

    sql = render_sql(args.environment)

    if args.output == "-":
        sys.stdout.write(sql)
    else:
        output_path = Path(args.output)
        output_path.write_text(sql, encoding="utf-8")
        output_path.chmod(0o600)
        print(f"✓ SQL renderizado en {output_path} (entorno: {args.environment})", file=sys.stderr)


if __name__ == "__main__":
    main()
