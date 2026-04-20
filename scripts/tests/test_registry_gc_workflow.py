"""Tests estructurales para el mantenimiento operativo de DOCR."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_registry_gc_script_exists():
    assert (REPO_ROOT / "scripts" / "registry-gc.sh").exists(), (
        "La higiene de DOCR debe vivir en un script auditable y reutilizable"
    )


def test_operations_workflow_uses_registry_gc_script():
    workflow = read(".github/workflows/operations.yml")

    assert "bash scripts/registry-gc.sh" in workflow, (
        "operations.yml debe delegar el GC de DOCR a scripts/registry-gc.sh"
    )


def test_operations_workflow_no_longer_inlines_registry_gc_logic():
    workflow = read(".github/workflows/operations.yml")

    assert 'doctl registry repository list-tags "$REGISTRY/$REPO"' not in workflow
    assert 'doctl registry repository delete-tag "$REGISTRY/$REPO" "$tag" --force' not in workflow
    assert 'doctl registry garbage-collection start "$REGISTRY"' not in workflow
    assert 'doctl registry garbage-collection list "$REGISTRY"' not in workflow


def test_registry_gc_script_contains_the_docr_operations():
    script = read("scripts/registry-gc.sh")

    assert "doctl registry repository list-tags" in script
    assert "doctl registry repository delete-tag" in script
    assert "doctl registry garbage-collection start" in script
    assert "doctl registry garbage-collection list" in script
