#!/usr/bin/env python3
"""
Renderiza infra/config/templates/app.env.j2 con valores de variables de entorno
y escribe el .env resultante al archivo especificado con --output.

Uso:
  ANTHROPIC_API_KEY=sk-ant-... \
  OPENAI_API_KEY=sk-proj-... \
  DATABASE_URL=postgresql://... \
  NEXT_PUBLIC_APP_URL=https://app.ebuddy.io \
    python3 scripts/render-env.py --output /opt/ebuddy/.env

El archivo resultante tiene permisos 600 (solo lectura del propietario).

Exit code 0 = éxito, 1 = fallo.
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from jinja2 import Environment, FileSystemLoader, StrictUndefined
except ImportError:
    print("ERROR: jinja2 no está instalado. Ejecuta: pip install jinja2", file=sys.stderr)
    sys.exit(1)

REPO_ROOT     = Path(__file__).resolve().parent.parent
TEMPLATE_DIR  = REPO_ROOT / "infra" / "config" / "templates"
TEMPLATE_FILE = "app.env.j2"

REQUIRED_VARS = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "DATABASE_URL",
    "NEXT_PUBLIC_APP_URL",
]

OPTIONAL_VARS = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "MICROSOFT_TENANT_ID",
    "MICROSOFT_REDIRECT_URI",
]


def render_env() -> str:
    missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
    if missing:
        print(f"ERROR: Variables de entorno requeridas faltantes: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    context = {v: os.environ[v] for v in REQUIRED_VARS}
    for v in OPTIONAL_VARS:
        context[v] = os.environ.get(v, "")

    jinja_env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
    )
    template = jinja_env.get_template(TEMPLATE_FILE)
    return template.render(**context)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Renderiza app.env.j2 con secrets de GitHub Actions."
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Archivo .env de salida (ej: /opt/ebuddy/.env)",
    )
    args = parser.parse_args()

    rendered = render_env()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered, encoding="utf-8")
    output_path.chmod(0o600)
    print(f"✓ .env escrito en {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
