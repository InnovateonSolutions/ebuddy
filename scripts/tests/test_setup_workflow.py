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
    assert "workflow_call:" in workflow, (
        "setup.yml debe poder invocarse desde CI para automatizar cambios en infra/ansible"
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


def test_ansible_cfg_declares_roles_path():
    cfg = (REPO_ROOT / "infra" / "ansible" / "ansible.cfg").read_text()
    assert "roles_path" in cfg, (
        "ansible.cfg debe declarar roles_path para que los roles sean encontrados "
        "sin importar desde qué directorio se invoque el playbook"
    )


def test_ansible_cfg_uses_core_compatible_callback():
    cfg = (REPO_ROOT / "infra" / "ansible" / "ansible.cfg").read_text()
    assert "stdout_callback = yaml" not in cfg, (
        "El callback 'yaml' requiere community.general que no está en ansible-core; "
        "usar 'default' para compatibilidad con la instalación mínima de CI"
    )


def test_ci_triggers_elitemini_setup_when_ansible_folder_changes():
    workflow = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()

    assert "ansible_changed" in workflow, (
        "ci.yml debe detectar cambios en infra/ansible para disparar setup automatico"
    )
    assert "infra/ansible/*" in workflow or "infra/ansible/**" in workflow, (
        "ci.yml debe considerar infra/ansible como superficie operativa con auto-setup"
    )
    assert "uses: ./.github/workflows/setup.yml" in workflow, (
        "ci.yml debe invocar setup.yml cuando cambie la automatizacion de elitemini"
    )
    assert "target: elitemini" in workflow
    assert "playbook: install-node-exporter" in workflow
