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
