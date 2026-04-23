from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_setup_workflow_uses_ansible_for_elitemini_playbooks():
    workflow = (REPO_ROOT / ".github" / "workflows" / "setup.yml").read_text()

    assert "ansible-playbook" in workflow, (
        "setup.yml debe ejecutar ansible-playbook para el target elitemini"
    )
    assert "infra/ansible/playbooks/" in workflow, (
        "setup.yml debe invocar playbooks Ansible versionados para elitemini"
    )
    assert "Copy playbook to elitemini" not in workflow, (
        "elitemini ya no debe depender de copiar scripts shell ad hoc"
    )
    assert "Run playbook on elitemini" not in workflow, (
        "elitemini debe ejecutarse vía Ansible y no con bash remoto directo"
    )


def test_setup_workflow_keeps_shell_transport_for_droplet_setup():
    workflow = (REPO_ROOT / ".github" / "workflows" / "setup.yml").read_text()

    assert "Copy playbook to Droplet" in workflow
    assert "Run playbook on Droplet" in workflow


def test_ansible_node_exporter_role_exists_for_elitemini_monitoring():
    assert (REPO_ROOT / "infra" / "ansible" / "playbooks" / "install-node-exporter.yml").exists(), (
        "El monitoreo de elitemini debe declararse en un playbook Ansible real"
    )
    assert (REPO_ROOT / "infra" / "ansible" / "roles" / "node_exporter" / "tasks" / "main.yml").exists(), (
        "El rol node_exporter debe existir para automatizar el host remoto"
    )
    assert (REPO_ROOT / "infra" / "ansible" / "inventory" / "hosts.yml").exists(), (
        "Ansible debe tener inventario versionado para elitemini"
    )
