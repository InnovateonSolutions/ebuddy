"""Tests estructurales para la integración local de Jira."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_jira_scripts_exist():
    for rel_path in [
        "scripts/jira/common.sh",
        "scripts/jira/create-issue.sh",
        "scripts/jira/transitions.sh",
        "scripts/jira/close-issue.sh",
    ]:
        assert (REPO_ROOT / rel_path).exists(), (
            f"{rel_path} debe existir para automatizar el flujo de Jira de AGENTS.md"
        )


def test_jira_scripts_require_expected_environment_variables():
    common = read("scripts/jira/common.sh")

    for var_name in [
        "JIRA_BASE_URL",
        "JIRA_PROJECT_KEY",
        "JIRA_EMAIL",
        "JIRA_TOKEN",
    ]:
        assert var_name in common, (
            f"scripts/jira/common.sh debe validar {var_name} antes de llamar a Jira"
        )


def test_create_issue_script_enforces_agent_process_fields():
    script = read("scripts/jira/create-issue.sh")

    assert "--title" in script
    assert "--problem" in script
    assert "--acceptance" in script
    assert "--notes" in script
    assert "--type" in script
    assert "--priority" in script
    assert "--labels" in script
    assert "jira_api" in script
    assert "/rest/api/3/issue" in script


def test_jira_docs_and_local_persistence_are_documented():
    getting_started = read("docs/development/getting-started.md")
    gitignore = read(".gitignore")
    envrc_example = read(".envrc.example")

    assert "JIRA_BASE_URL" in getting_started
    assert "direnv" in getting_started
    assert ".envrc" in gitignore, ".envrc debe ignorarse para no versionar secretos locales"
    assert "export JIRA_BASE_URL=" in envrc_example
    assert "export JIRA_TOKEN=" in envrc_example
