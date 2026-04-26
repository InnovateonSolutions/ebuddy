from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text()


def test_gitlab_playbook_exists_for_elitemini():
    assert (REPO_ROOT / "infra" / "ansible" / "playbooks" / "install-gitlab.yml").exists(), (
        "GitLab en elitemini debe declararse en un playbook Ansible versionado"
    )


def test_gitlab_playbook_targets_elitemini_role():
    playbook = read("infra/ansible/playbooks/install-gitlab.yml")
    assert "hosts: elitemini" in playbook
    assert "gather_facts: true" in playbook
    assert "- role: gitlab" in playbook


def test_gitlab_role_exists_and_installs_omnibus_package():
    role = read("infra/ansible/roles/gitlab/tasks/main.yml")
    assert "gitlab-ce" in role, "El role debe instalar el paquete omnibus de GitLab CE"
    assert "apt_repository" in role or "deb " in role, (
        "El role debe configurar el repositorio oficial de GitLab"
    )


def test_gitlab_role_configures_gitlab_rb_and_reconfigure():
    role = read("infra/ansible/roles/gitlab/tasks/main.yml")
    assert "/etc/gitlab/gitlab.rb" in role, (
        "El role debe gestionar el archivo principal de configuracion de GitLab"
    )
    assert "external_url" in role, (
        "El role debe fijar external_url para una instalacion reproducible"
    )
    assert "gitlab-ctl reconfigure" in role, (
        "El role debe ejecutar gitlab-ctl reconfigure cuando cambia la configuracion"
    )


def test_gitlab_role_enables_gitlab_service():
    role = read("infra/ansible/roles/gitlab/tasks/main.yml")
    assert "gitlab-runsvdir" in role or "service: gitlab" in role or "name: gitlab" in role, (
        "El role debe dejar GitLab habilitado y corriendo tras la instalacion"
    )


def test_setup_workflow_can_dispatch_gitlab_playbook():
    workflow = read(".github/workflows/setup.yml")
    assert "install-gitlab" in workflow, (
        "setup.yml debe exponer install-gitlab como playbook manual para elitemini"
    )


def test_gitlab_runner_playbook_exists_for_elitemini():
    assert (REPO_ROOT / "infra" / "ansible" / "playbooks" / "install-gitlab-runner.yml").exists(), (
        "El GitLab Runner de elitemini debe declararse en un playbook Ansible versionado"
    )


def test_gitlab_runner_playbook_targets_runner_role():
    playbook = read("infra/ansible/playbooks/install-gitlab-runner.yml")
    assert "hosts: elitemini" in playbook
    assert "gather_facts: true" in playbook
    assert "- role: gitlab_runner" in playbook


def test_gitlab_runner_role_installs_docker_executor_runner():
    role = read("infra/ansible/roles/gitlab_runner/tasks/main.yml")
    assert "gitlab-runner" in role
    assert "docker-ce" in role
    assert "docker-buildx-plugin" in role
    assert "docker-compose-plugin" in role
    assert "download.docker.com" in role
    assert "gitlab-runner register" in role
    assert "--executor docker" in role
    assert "--docker-image ubuntu:24.04" in role
    assert "--tag-list linux,docker,elitemini" in role
    assert "gitlab_runner_token" in role
    assert "no_log: true" in role


def test_gitlab_runner_bootstrap_is_dispatchable_not_automatic():
    doc = read("docs/operations/gitlab-runner.md")
    setup = read(".github/workflows/setup.yml")
    ci = read(".github/workflows/ci.yml")

    # Documentado en el runbook
    assert "GITLAB_RUNNER_TOKEN" in doc
    assert "ansible-playbook infra/ansible/playbooks/install-gitlab-runner.yml" in doc

    # Disponible como dispatch manual en setup.yml con el token como secret
    assert "install-gitlab-runner" in setup
    assert "GITLAB_RUNNER_TOKEN" in setup

    # NO se dispara automáticamente desde CI (evita re-registro accidental)
    assert "install-gitlab-runner" not in ci


def test_gitlab_ci_uses_self_hosted_runner_tags_for_initial_validation():
    workflow = read(".gitlab-ci.yml")

    assert "linux" in workflow
    assert "docker" in workflow
    assert "elitemini" in workflow
    assert "python3 -m pytest scripts/tests/ -v" in workflow
    assert "ansible-playbook --syntax-check infra/ansible/playbooks/install-gitlab-runner.yml" in workflow
