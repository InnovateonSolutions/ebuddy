from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_deploy_workflow_uses_positive_paths_filter():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "workflow_call:" in workflow
    assert "workflow_dispatch:" in workflow
    assert "paths:" not in workflow
    assert "paths-ignore:" not in workflow


def test_deploy_workflow_is_not_directly_triggered_by_push():
    workflow = (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()

    assert "\n  push:\n" not in workflow
    assert "\n  pull_request:\n" not in workflow


def test_ci_workflow_detects_application_and_infrastructure_changes():
    workflow = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()

    for expected_path in (
        "app/*|components/*|hooks/*|lib/*|types/*|public/*|db/*|drizzle/*",
        "infra/*|.github/workflows/terraform.yml|.github/workflows/bootstrap-deploy.yml",
        "terraform-plan:",
        "uses: ./.github/workflows/deploy.yml",
        "uses: ./.github/workflows/terraform.yml",
    ):
        assert expected_path in workflow
