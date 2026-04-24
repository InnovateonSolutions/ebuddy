"""Tests estructurales para el mantenimiento operativo de DOCR."""

import os
import subprocess
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
    assert "doctl registry garbage-collection get-active" in script


def test_registry_gc_script_uses_machine_readable_output():
    script = read("scripts/registry-gc.sh")

    assert "--output json" in script, (
        "El script debe consultar doctl en formato JSON para no depender del layout tabular"
    )
    assert "awk '{print $3,$4,$5}'" not in script, (
        "El monitoreo de GC no debe parsear columnas humanas con awk"
    )


def test_registry_gc_script_tolerates_only_protected_tags(tmp_path):
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    doctl = fake_bin / "doctl"
    doctl.write_text(
        """#!/usr/bin/env bash
set -euo pipefail

case "$*" in
  "registry repository list-tags ebuddy-prod/ebuddy --no-header --format Tag")
    printf '%s\\n' latest migrator
    ;;
  "registry garbage-collection start ebuddy-prod --force --include-untagged-manifests --output json")
    printf '%s\\n' '[{"uuid":"fake-gc","status":"requested"}]'
    ;;
  "registry garbage-collection get-active --output json")
    printf '%s\\n' '[]'
    ;;
  "registry garbage-collection list ebuddy-prod --output json")
    printf '%s\\n' '[{"uuid":"fake-gc","status":"succeeded","blobs_deleted":0,"freed_bytes":0}]'
    ;;
  *)
    printf 'unexpected doctl call: %s\\n' "$*" >&2
    exit 99
    ;;
esac
"""
    )
    doctl.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"

    result = subprocess.run(
        ["bash", "scripts/registry-gc.sh"],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr + result.stdout
    assert "Registry GC completado" in result.stdout


def test_registry_gc_script_treats_tag_listing_as_best_effort(tmp_path):
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    doctl = fake_bin / "doctl"
    doctl.write_text(
        """#!/usr/bin/env bash
set -euo pipefail

case "$*" in
  "registry repository list-tags ebuddy-prod/ebuddy --no-header --format Tag")
    exit 1
    ;;
  "registry garbage-collection start ebuddy-prod --force --include-untagged-manifests --output json")
    printf '%s\\n' '[{"uuid":"fake-gc","status":"requested"}]'
    ;;
  "registry garbage-collection get-active --output json")
    printf '%s\\n' '[]'
    ;;
  "registry garbage-collection list ebuddy-prod --output json")
    printf '%s\\n' '[{"uuid":"fake-gc","status":"succeeded","blobs_deleted":0,"freed_bytes":0}]'
    ;;
  *)
    printf 'unexpected doctl call: %s\\n' "$*" >&2
    exit 99
    ;;
esac
"""
    )
    doctl.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"

    result = subprocess.run(
        ["bash", "scripts/registry-gc.sh"],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr + result.stdout
    assert "No se pudieron listar tags antiguas" in result.stderr
    assert "Registry GC completado" in result.stdout
