"""Tests KAN-94: mapeo de tipos de incidencia en scripts Jira."""
from pathlib import Path
import subprocess

REPO_ROOT = Path(__file__).resolve().parents[2]

def read(p): return (REPO_ROOT / p).read_text()

def test_common_sh_has_map_issue_type():
    assert "map_issue_type" in read("scripts/jira/common.sh")

def test_task_maps_to_tarea():
    result = subprocess.run(
        ["bash", "-c", "source scripts/jira/common.sh && map_issue_type 'Task'"],
        capture_output=True, text=True, cwd=REPO_ROOT
    )
    assert result.stdout.strip() == "Tarea"

def test_story_maps_to_historia():
    result = subprocess.run(
        ["bash", "-c", "source scripts/jira/common.sh && map_issue_type 'Story'"],
        capture_output=True, text=True, cwd=REPO_ROOT
    )
    assert result.stdout.strip() == "Historia"

def test_bug_maps_to_tarea():
    result = subprocess.run(
        ["bash", "-c", "source scripts/jira/common.sh && map_issue_type 'Bug'"],
        capture_output=True, text=True, cwd=REPO_ROOT
    )
    assert result.stdout.strip() == "Tarea"

def test_create_issue_uses_map_issue_type():
    content = read("scripts/jira/create-issue.sh")
    assert "map_issue_type" in content
