from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _deploy_yml() -> str:
    return (REPO_ROOT / ".github" / "workflows" / "deploy.yml").read_text()


def test_prometheus_url_written_to_env_on_deploy():
    deploy = _deploy_yml()
    assert "PROMETHEUS_URL=http://host.docker.internal:9090" in deploy, (
        "deploy.yml debe escribir PROMETHEUS_URL al .env del Droplet; "
        "sin esta var la app muestra 'No configurado' en el panel de infra"
    )


def test_elitemini_instance_written_to_env_on_deploy():
    deploy = _deploy_yml()
    assert "ELITEMINI_INSTANCE=100.80.59.3:9100" in deploy, (
        "deploy.yml debe escribir ELITEMINI_INSTANCE al .env del Droplet; "
        "debe coincidir con el label 'instance' en prometheus.yml"
    )


def test_prometheus_instance_matches_prometheus_yml():
    deploy = _deploy_yml()
    prometheus_yml = (REPO_ROOT / "infra" / "prometheus" / "prometheus.yml").read_text()
    assert "100.80.59.3:9100" in prometheus_yml, (
        "prometheus.yml debe tener el target 100.80.59.3:9100 para que "
        "ELITEMINI_INSTANCE coincida con los datos scrapeados"
    )
    assert "100.80.59.3:9100" in deploy, (
        "El ELITEMINI_INSTANCE en deploy.yml debe coincidir con el target en prometheus.yml"
    )
