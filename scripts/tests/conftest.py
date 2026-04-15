"""
Fixtures y helpers compartidos para los tests de los scripts Python.

Los scripts tienen guiones en el nombre (get-droplet-ip.py) — no son módulos
importables directamente. Se usa importlib para cargarlos por ruta.
"""

import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parent.parent


def load_script(filename: str):
    """Carga un script Python (con guiones en el nombre) como módulo."""
    path = SCRIPTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Script no encontrado: {path}")

    module_name = filename.replace("-", "_").removesuffix(".py")
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    # No agregar a sys.modules para evitar colisiones entre tests
    spec.loader.exec_module(module)
    return module


# ─── Fixtures de respuestas DO API ───────────────────────────────────────────

@pytest.fixture
def droplet_api_response():
    """Respuesta válida de la DO API con un droplet activo."""
    return {
        "droplets": [
            {
                "id": 123456789,
                "name": "ebuddy-prod-droplet",
                "status": "active",
                "networks": {
                    "v4": [
                        {"ip_address": "192.0.2.10", "type": "public"},
                        {"ip_address": "10.0.0.5", "type": "private"},
                    ]
                },
            }
        ]
    }


@pytest.fixture
def empty_droplets_response():
    return {"droplets": []}


@pytest.fixture
def no_public_ip_response():
    return {
        "droplets": [
            {
                "id": 123456789,
                "name": "ebuddy-prod-droplet",
                "status": "active",
                "networks": {
                    "v4": [{"ip_address": "10.0.0.5", "type": "private"}]
                },
            }
        ]
    }
