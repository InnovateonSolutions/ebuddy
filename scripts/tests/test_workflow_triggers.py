from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_deploy_workflow_uses_positive_paths_filter():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "paths:" in workflow
    assert "paths-ignore:" not in workflow


def test_deploy_workflow_does_not_trigger_from_infra_docs_or_scripts_only_changes():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "  - 'infra/**'" not in workflow
    assert "  - 'docs/**'" not in workflow
    assert "  - 'scripts/**'" not in workflow


def test_deploy_workflow_includes_application_paths():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    for expected_path in (
        "  - 'app/**'",
        "  - 'components/**'",
        "  - 'lib/**'",
        "  - 'hooks/**'",
        "  - 'drizzle/**'",
        "  - 'Dockerfile'",
    ):
        assert expected_path in workflow
