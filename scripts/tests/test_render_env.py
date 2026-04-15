"""
Tests unitarios para scripts/render-env.py

Cubre:
- Todas las vars requeridas presentes → .env renderizado correctamente
- Var requerida faltante → SystemExit(1) con mensaje descriptivo
- Vars opcionales de Google Calendar presentes → aparecen en .env
- Vars opcionales ausentes → secciones condicionales no aparecen
- Archivo de salida tiene permisos 600
- DATABASE_URL no contiene credenciales de Supabase (usa DO Managed DB)
- Secrets nunca aparecen en stdout (solo en el archivo)
"""

import os
import stat
from unittest.mock import patch

import pytest

from .conftest import load_script

render_env_mod = load_script("render-env.py")

# ─── Env vars base para tests ────────────────────────────────────────────────

BASE_ENV = {
    "ANTHROPIC_API_KEY":              "sk-ant-test-key",
    "OPENAI_API_KEY":                 "sk-proj-test-key",
    "DATABASE_URL":                   "postgresql://app:pass@db.example.com:25060/ebuddy?sslmode=require",
    "NEXT_PUBLIC_APP_URL":            "https://app.ebuddy.io",
}

GOOGLE_ENV = {
    "GOOGLE_CLIENT_ID":     "client-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "GOCSPX-secret",
    "GOOGLE_REDIRECT_URI":  "https://app.ebuddy.io/api/auth/calendar/google/callback",
}

MICROSOFT_ENV = {
    "MICROSOFT_CLIENT_ID":     "ms-client-id",
    "MICROSOFT_CLIENT_SECRET": "ms-secret",
    "MICROSOFT_TENANT_ID":     "common",
    "MICROSOFT_REDIRECT_URI":  "https://app.ebuddy.io/api/auth/calendar/microsoft/callback",
}


# ─── Tests de renderizado ─────────────────────────────────────────────────────

class TestRenderEnv:

    def test_happy_path_renders_all_required_vars(self, monkeypatch):
        """Todas las vars requeridas → .env contiene las claves correctas."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        for k in [*GOOGLE_ENV, *MICROSOFT_ENV]:
            monkeypatch.delenv(k, raising=False)

        content = render_env_mod.render_env()

        assert "ANTHROPIC_API_KEY=sk-ant-test-key" in content
        assert "OPENAI_API_KEY=sk-proj-test-key" in content
        assert "DATABASE_URL=postgresql://" in content
        assert "NEXT_PUBLIC_APP_URL=https://app.ebuddy.io" in content

    def test_missing_anthropic_key_exits_1(self, monkeypatch):
        """ANTHROPIC_API_KEY faltante → SystemExit(1)."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        monkeypatch.delenv("ANTHROPIC_API_KEY")

        with pytest.raises(SystemExit) as exc:
            render_env_mod.render_env()
        assert exc.value.code == 1

    def test_missing_database_url_exits_1(self, monkeypatch):
        """DATABASE_URL faltante → SystemExit(1)."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        monkeypatch.delenv("DATABASE_URL")

        with pytest.raises(SystemExit) as exc:
            render_env_mod.render_env()
        assert exc.value.code == 1

    def test_missing_openai_key_exits_1(self, monkeypatch):
        """OPENAI_API_KEY faltante → SystemExit(1)."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        monkeypatch.delenv("OPENAI_API_KEY")

        with pytest.raises(SystemExit) as exc:
            render_env_mod.render_env()
        assert exc.value.code == 1

    def test_all_required_vars_missing_exits_1(self, monkeypatch):
        """Todas las vars requeridas faltantes → SystemExit(1)."""
        for k in BASE_ENV:
            monkeypatch.delenv(k, raising=False)
        for k in [*GOOGLE_ENV, *MICROSOFT_ENV]:
            monkeypatch.delenv(k, raising=False)

        with pytest.raises(SystemExit) as exc:
            render_env_mod.render_env()
        assert exc.value.code == 1

    def test_google_calendar_section_included_when_vars_present(self, monkeypatch):
        """Con vars de Google → sección de Google Calendar aparece en .env."""
        for k, v in {**BASE_ENV, **GOOGLE_ENV}.items():
            monkeypatch.setenv(k, v)
        for k in MICROSOFT_ENV:
            monkeypatch.delenv(k, raising=False)

        content = render_env_mod.render_env()

        assert "GOOGLE_CLIENT_ID=client-id.apps.googleusercontent.com" in content
        assert "GOOGLE_CLIENT_SECRET=GOCSPX-secret" in content

    def test_google_calendar_section_absent_when_vars_missing(self, monkeypatch):
        """Sin vars de Google → sección de Google Calendar NO aparece en .env."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        for k in [*GOOGLE_ENV, *MICROSOFT_ENV]:
            monkeypatch.delenv(k, raising=False)

        content = render_env_mod.render_env()

        assert "GOOGLE_CLIENT_ID" not in content
        assert "GOOGLE_CLIENT_SECRET" not in content

    def test_microsoft_calendar_section_included_when_vars_present(self, monkeypatch):
        """Con vars de Microsoft → sección de Outlook Calendar aparece en .env."""
        for k, v in {**BASE_ENV, **MICROSOFT_ENV}.items():
            monkeypatch.setenv(k, v)
        for k in GOOGLE_ENV:
            monkeypatch.delenv(k, raising=False)

        content = render_env_mod.render_env()

        assert "MICROSOFT_CLIENT_ID=ms-client-id" in content
        assert "MICROSOFT_TENANT_ID=common" in content

    def test_database_url_uses_do_managed_db_format(self, monkeypatch):
        """DATABASE_URL es una URL de PostgreSQL de DO Managed DB, no Supabase."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)

        content = render_env_mod.render_env()

        assert "DATABASE_URL=" in content
        # Confirmar que es PostgreSQL (no supabase.co)
        assert "supabase.co" not in content

    def test_no_supabase_keys_in_rendered_env(self, monkeypatch):
        """El .env generado NO contiene variables de Supabase (arquitectura nueva)."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)

        content = render_env_mod.render_env()

        assert "SUPABASE" not in content
        assert "supabase" not in content.lower()


# ─── Tests del CLI ────────────────────────────────────────────────────────────

class TestRenderEnvCLI:

    def test_output_file_is_created(self, tmp_path, monkeypatch):
        """Con --output, el archivo .env se crea en la ruta especificada."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        for k in [*GOOGLE_ENV, *MICROSOFT_ENV]:
            monkeypatch.delenv(k, raising=False)

        output_file = tmp_path / ".env"
        with patch("sys.argv", ["render-env.py", "--output", str(output_file)]):
            render_env_mod.main()

        assert output_file.exists()
        content = output_file.read_text()
        assert "ANTHROPIC_API_KEY" in content

    def test_output_file_permissions_are_600(self, tmp_path, monkeypatch):
        """El archivo .env tiene permisos 600 (solo el propietario puede leerlo)."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        for k in [*GOOGLE_ENV, *MICROSOFT_ENV]:
            monkeypatch.delenv(k, raising=False)

        output_file = tmp_path / ".env"
        with patch("sys.argv", ["render-env.py", "--output", str(output_file)]):
            render_env_mod.main()

        file_mode = stat.S_IMODE(output_file.stat().st_mode)
        assert file_mode == 0o600, f"Expected 600, got {oct(file_mode)}"

    def test_secrets_not_printed_to_stdout(self, tmp_path, monkeypatch, capsys):
        """Los secrets no se imprimen a stdout — solo van al archivo."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        for k in [*GOOGLE_ENV, *MICROSOFT_ENV]:
            monkeypatch.delenv(k, raising=False)

        output_file = tmp_path / ".env"
        with patch("sys.argv", ["render-env.py", "--output", str(output_file)]):
            render_env_mod.main()

        captured = capsys.readouterr()
        # stdout no debe contener los valores de los secrets
        assert "sk-ant-test-key" not in captured.out
        assert "sk-proj-test-key" not in captured.out

    def test_parent_dir_created_if_not_exists(self, tmp_path, monkeypatch):
        """Si el directorio padre no existe, se crea automáticamente."""
        for k, v in BASE_ENV.items():
            monkeypatch.setenv(k, v)
        for k in [*GOOGLE_ENV, *MICROSOFT_ENV]:
            monkeypatch.delenv(k, raising=False)

        nested_output = tmp_path / "opt" / "ebuddy" / ".env"
        with patch("sys.argv", ["render-env.py", "--output", str(nested_output)]):
            render_env_mod.main()

        assert nested_output.exists()
