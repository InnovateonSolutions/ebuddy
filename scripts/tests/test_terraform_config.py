from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_aws_provider_uses_dummy_credentials_when_route53_is_disabled():
    content = read("infra/terraform/main.tf")

    assert 'access_key = var.enable_route53 ? null : "noop"' in content
    assert 'secret_key = var.enable_route53 ? null : "noop"' in content
    assert 'skip_credentials_validation = true' in content
    assert 'skip_metadata_api_check     = true' in content
