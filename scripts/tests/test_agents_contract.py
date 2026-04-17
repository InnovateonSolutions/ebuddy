"""Tests estructurales para endurecer AGENTS.md como contrato vivo del repo."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_agents_requires_single_organizational_convention():
    content = read("AGENTS.md")

    assert "No recrear archivos en `types/` ni `hooks/`." in content
    assert "Si aparece una excepción nueva, primero se actualiza `AGENTS.md`" in content, (
        "AGENTS.md debe obligar a documentar cambios de convención antes de introducir excepciones"
    )
    assert "Todo helper reutilizable nuevo vive en `lib/`" in content, (
        "AGENTS.md debe blindar `lib/` como única casa de lógica compartida"
    )


def test_agents_requires_navigation_consistency_between_public_and_private_surfaces():
    content = read("AGENTS.md")

    assert "Las rutas autenticadas comparten un único patrón de navegación" in content, (
        "AGENTS.md debe prohibir layouts o navbars paralelas para superficies privadas"
    )
    assert "No mezclar `PublicNav` dentro de rutas protegidas" in content, (
        "AGENTS.md debe dejar explícita la separación entre navegación pública y autenticada"
    )


def test_agents_requires_product_copy_to_match_real_runtime_state():
    content = read("AGENTS.md")

    assert "La landing, login, status y settings deben describir el mismo estado real del producto" in content, (
        "AGENTS.md debe exigir consistencia narrativa entre superficies públicas y operativas"
    )
    assert "Eliminar mensajes legacy de \"despliegue inicial\"" in content, (
        "AGENTS.md debe impedir copy desactualizado que degrade la confianza del producto"
    )


def test_agents_requires_single_language_for_user_facing_labels():
    content = read("AGENTS.md")

    assert "Todo texto visible al usuario debe mantener el mismo idioma base por superficie" in content, (
        "AGENTS.md debe evitar mezclar ingles y español en una misma experiencia"
    )
    assert "No introducir labels de estados en inglés si la UI de esa vista está en español" in content, (
        "AGENTS.md debe fijar una regla concreta para estados y labels"
    )
