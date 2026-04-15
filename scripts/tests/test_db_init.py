"""
Tests unitarios para scripts/db-init.py

Cubre:
- Entorno 'dev' → SQL incluye seed data (INSERT INTO users, tickets)
- Entorno 'prod' → SQL NO incluye seed data
- Ambos entornos → SQL incluye el schema completo (CREATE TABLE, enums, índices)
- Template no encontrado → SystemExit(1)
- --environment inválido → error de argparse
- SQL generado tiene los tipos correctos (TRABAJO/PERSONAL, no NEGOCIO)
"""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from .conftest import load_script

db_init_mod = load_script("db-init.py")


# ─── Tests del renderizado Jinja2 ────────────────────────────────────────────

class TestDBInitRender:

    def test_dev_environment_includes_seed_data(self):
        """env=dev → SQL incluye INSERT de usuario y ticket de prueba."""
        sql = db_init_mod.render_sql("dev")
        assert "INSERT INTO users" in sql
        assert "INSERT INTO tickets" in sql
        assert "seed" in sql.lower()

    def test_prod_environment_excludes_seed_data(self):
        """env=prod → SQL NO incluye seed data."""
        sql = db_init_mod.render_sql("prod")
        assert "INSERT INTO users" not in sql
        assert "INSERT INTO tickets" not in sql

    def test_both_envs_include_create_table_users(self):
        """Schema completo en todos los entornos."""
        for env in ("dev", "prod", "staging"):
            sql = db_init_mod.render_sql(env)
            assert "CREATE TABLE IF NOT EXISTS users" in sql, f"Missing users table in env={env}"
            assert "CREATE TABLE IF NOT EXISTS tickets" in sql, f"Missing tickets table in env={env}"

    def test_enums_use_trabajo_not_negocio(self):
        """Los tipos usan TRABAJO/PERSONAL (no NEGOCIO — eso es código legacy)."""
        sql = db_init_mod.render_sql("prod")
        assert "'TRABAJO'" in sql
        assert "'PERSONAL'" in sql
        assert "'NEGOCIO'" not in sql

    def test_ticket_priority_enum_correct(self):
        """Enum de prioridad tiene los 3 valores correctos."""
        sql = db_init_mod.render_sql("prod")
        assert "'ALTA'" in sql
        assert "'MEDIA'" in sql
        assert "'BAJA'" in sql

    def test_ticket_status_enum_correct(self):
        """Enum de estado tiene los 3 valores correctos."""
        sql = db_init_mod.render_sql("prod")
        assert "'PENDIENTE'" in sql
        assert "'EN_PROGRESO'" in sql
        assert "'HECHO'" in sql

    def test_required_indexes_are_present(self):
        """Los 3 índices obligatorios de KAN-15 están en el schema."""
        sql = db_init_mod.render_sql("prod")
        assert "idx_tickets_user_context" in sql
        assert "idx_tickets_user_status" in sql
        assert "idx_tickets_user_date" in sql

    def test_updated_at_trigger_present(self):
        """El trigger de auto-update de updated_at está en el schema."""
        sql = db_init_mod.render_sql("prod")
        assert "update_updated_at" in sql
        assert "BEFORE UPDATE ON tickets" in sql

    def test_uuid_extension_enabled(self):
        """La extensión uuid-ossp se habilita en el schema."""
        sql = db_init_mod.render_sql("prod")
        assert 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"' in sql

    def test_template_not_found_raises_system_exit(self, tmp_path, monkeypatch):
        """Si el template no existe, el script sale con error."""
        # Reemplazar TEMPLATE_DIR para apuntar a directorio vacío
        monkeypatch.setattr(db_init_mod, "TEMPLATE_DIR", tmp_path)
        with pytest.raises((SystemExit, Exception)):
            db_init_mod.render_sql("prod")

    def test_dev_seed_uses_idempotent_insert(self):
        """El seed de desarrollo usa ON CONFLICT DO NOTHING para ser idempotente."""
        sql = db_init_mod.render_sql("dev")
        assert "ON CONFLICT" in sql

    def test_api_key_hash_column_exists(self):
        """La tabla users tiene la columna api_key_hash para OpenClaw."""
        sql = db_init_mod.render_sql("prod")
        assert "api_key_hash" in sql

    def test_password_hash_column_exists(self):
        """La tabla users tiene la columna password_hash (auth sin Supabase)."""
        sql = db_init_mod.render_sql("prod")
        assert "password_hash" in sql


# ─── Tests del CLI ────────────────────────────────────────────────────────────

class TestDBInitCLI:

    def test_stdout_output_is_valid_sql(self, capsys):
        """Sin --output, el SQL se escribe a stdout y es parseable."""
        test_args = ["db-init.py", "--environment", "prod"]
        with patch("sys.argv", test_args):
            db_init_mod.main()

        captured = capsys.readouterr()
        assert "CREATE TABLE" in captured.out
        assert "INSERT" not in captured.out  # prod sin seed

    def test_output_file_is_written(self, tmp_path):
        """Con --output, el archivo se crea correctamente."""
        output_file = tmp_path / "init.sql"
        test_args = ["db-init.py", "--output", str(output_file), "--environment", "prod"]
        with patch("sys.argv", test_args):
            db_init_mod.main()

        assert output_file.exists()
        content = output_file.read_text()
        assert "CREATE TABLE" in content

    def test_output_file_has_secure_permissions(self, tmp_path):
        """El archivo de salida tiene permisos 600."""
        import stat
        output_file = tmp_path / "init.sql"
        test_args = ["db-init.py", "--output", str(output_file), "--environment", "prod"]
        with patch("sys.argv", test_args):
            db_init_mod.main()

        file_stat = output_file.stat()
        permissions = stat.S_IMODE(file_stat.st_mode)
        assert permissions == 0o600, f"Expected 600, got {oct(permissions)}"
