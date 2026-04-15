"""
Tests unitarios para scripts/get-droplet-ip.py

Cubre:
- Happy path: droplet encontrado con IP pública → retorna IP
- Droplet no existe → SystemExit(1)
- Droplet sin IP pública (solo privada) → SystemExit(1)
- DO API retorna HTTP 401 → SystemExit(1)
- DO API retorna HTTP 500 → SystemExit(1)
- Error de red (URLError) → SystemExit(1)
- DROPLET_NAME no configurada → SystemExit(1)
- DO_TOKEN no configurado → SystemExit(1)
"""

import json
import urllib.error
import urllib.request
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest

from .conftest import load_script

# Cargar el módulo una vez para todos los tests
get_droplet_ip_mod = load_script("get-droplet-ip.py")


# ─── Helper ──────────────────────────────────────────────────────────────────

def make_urlopen_mock(payload: dict, status: int = 200):
    """Crea un mock de urlopen que retorna el payload como JSON."""
    response_body = json.dumps(payload).encode()
    mock_response = MagicMock()
    mock_response.read.return_value = response_body
    mock_response.__enter__ = lambda s: s
    mock_response.__exit__ = MagicMock(return_value=False)
    return mock_response


# ─── Tests ───────────────────────────────────────────────────────────────────

class TestGetDropletIP:

    def test_happy_path_returns_public_ip(self, droplet_api_response):
        """Droplet encontrado con IP pública → retorna la IP correcta."""
        with patch("urllib.request.urlopen") as mock_open:
            mock_open.return_value = make_urlopen_mock(droplet_api_response)
            ip = get_droplet_ip_mod.get_droplet_ip(
                droplet_name="ebuddy-prod-droplet",
                do_token="dop_v1_test",
            )
        assert ip == "192.0.2.10"

    def test_returns_first_public_ip_when_multiple(self):
        """Si hay múltiples IPs públicas, retorna la primera."""
        payload = {
            "droplets": [{
                "id": 1,
                "name": "test-droplet",
                "status": "active",
                "networks": {"v4": [
                    {"ip_address": "1.2.3.4", "type": "public"},
                    {"ip_address": "5.6.7.8", "type": "public"},
                ]},
            }]
        }
        with patch("urllib.request.urlopen") as mock_open:
            mock_open.return_value = make_urlopen_mock(payload)
            ip = get_droplet_ip_mod.get_droplet_ip("test", "token")
        assert ip == "1.2.3.4"

    def test_droplet_not_found_exits_1(self, empty_droplets_response):
        """API retorna lista vacía → exit code 1."""
        with patch("urllib.request.urlopen") as mock_open:
            mock_open.return_value = make_urlopen_mock(empty_droplets_response)
            with pytest.raises(SystemExit) as exc:
                get_droplet_ip_mod.get_droplet_ip("no-existe", "token")
        assert exc.value.code == 1

    def test_no_public_ip_exits_1(self, no_public_ip_response):
        """Droplet encontrado pero sin IP pública → exit code 1."""
        with patch("urllib.request.urlopen") as mock_open:
            mock_open.return_value = make_urlopen_mock(no_public_ip_response)
            with pytest.raises(SystemExit) as exc:
                get_droplet_ip_mod.get_droplet_ip("ebuddy-prod-droplet", "token")
        assert exc.value.code == 1

    def test_http_401_unauthorized_exits_1(self):
        """Token inválido → DO API retorna 401 → exit code 1."""
        http_error = urllib.error.HTTPError(
            url="https://api.digitalocean.com/v2/droplets",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=BytesIO(b'{"id":"unauthorized","message":"Unable to authenticate you."}'),
        )
        with patch("urllib.request.urlopen", side_effect=http_error):
            with pytest.raises(SystemExit) as exc:
                get_droplet_ip_mod.get_droplet_ip("any", "bad-token")
        assert exc.value.code == 1

    def test_http_500_server_error_exits_1(self):
        """DO API retorna 500 → exit code 1."""
        http_error = urllib.error.HTTPError(
            url="https://api.digitalocean.com/v2/droplets",
            code=500,
            msg="Internal Server Error",
            hdrs={},
            fp=BytesIO(b'{"message":"internal server error"}'),
        )
        with patch("urllib.request.urlopen", side_effect=http_error):
            with pytest.raises(SystemExit) as exc:
                get_droplet_ip_mod.get_droplet_ip("any", "token")
        assert exc.value.code == 1

    def test_network_error_exits_1(self):
        """Error de red (timeout, DNS) → exit code 1."""
        url_error = urllib.error.URLError(reason="Connection timed out")
        with patch("urllib.request.urlopen", side_effect=url_error):
            with pytest.raises(SystemExit) as exc:
                get_droplet_ip_mod.get_droplet_ip("any", "token")
        assert exc.value.code == 1

    def test_missing_droplet_name_env_exits_1(self, monkeypatch):
        """DROPLET_NAME no configurada → main() sale con code 1."""
        monkeypatch.delenv("DROPLET_NAME", raising=False)
        monkeypatch.setenv("DO_TOKEN", "token")
        with pytest.raises(SystemExit) as exc:
            get_droplet_ip_mod.main()
        assert exc.value.code == 1

    def test_missing_do_token_env_exits_1(self, monkeypatch):
        """DO_TOKEN no configurado → main() sale con code 1."""
        monkeypatch.setenv("DROPLET_NAME", "ebuddy-prod-droplet")
        monkeypatch.delenv("DO_TOKEN", raising=False)
        with pytest.raises(SystemExit) as exc:
            get_droplet_ip_mod.main()
        assert exc.value.code == 1

    def test_request_includes_auth_header(self, droplet_api_response):
        """La petición HTTP incluye el header Authorization con el token."""
        captured_request = {}

        def fake_urlopen(req, timeout=None):
            captured_request["headers"] = dict(req.headers)
            return make_urlopen_mock(droplet_api_response)

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            get_droplet_ip_mod.get_droplet_ip("ebuddy-prod-droplet", "dop_v1_mytoken")

        assert "Authorization" in captured_request["headers"]
        assert "dop_v1_mytoken" in captured_request["headers"]["Authorization"]

    def test_droplet_name_is_url_encoded_in_request(self, droplet_api_response):
        """El nombre del droplet se URL-encodea correctamente en la query string."""
        captured_url = {}

        def fake_urlopen(req, timeout=None):
            captured_url["url"] = req.full_url
            return make_urlopen_mock(droplet_api_response)

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            get_droplet_ip_mod.get_droplet_ip("my droplet", "token")

        assert "my+droplet" in captured_url["url"] or "my%20droplet" in captured_url["url"]
