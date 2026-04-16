"""
Tests unitarios para scripts/db-init.py.

Cubre:
- db-init renderiza el schema actual desde las migraciones de Drizzle
- el SQL incluye tablas y cambios vigentes del runtime real
- el SQL no conserva enums, columnas ni auth legacy
- el CLI escribe el output con permisos 600
"""

from pathlib import Path
from unittest.mock import patch

import pytest

from .conftest import load_script

db_init_mod = load_script("db-init.py")
REPO_ROOT = Path(__file__).resolve().parents[2]


class TestDBInitRender:

    def test_legacy_template_is_removed(self):
        assert not (REPO_ROOT / "db" / "init.sql.j2").exists()

    def test_rendered_sql_includes_current_auth_and_app_tables(self):
        sql = db_init_mod.render_sql()

        for expected in [
            'CREATE TABLE "users"',
            'CREATE TABLE "accounts"',
            'CREATE TABLE "sessions"',
            'CREATE TABLE "verification_tokens"',
            'CREATE TABLE "tickets"',
            'CREATE TABLE "user_preferences"',
            'CREATE TABLE "calendar_tokens"',
            'CREATE TABLE "visit_counter"',
        ]:
            assert expected in sql

    def test_rendered_sql_includes_current_enums_and_migration_changes(self):
        sql = db_init_mod.render_sql()

        assert "'NEGOCIO'" in sql
        assert "'PERSONAL'" in sql
        assert "'PENDING'" in sql
        assert "'IN_PROGRESS'" in sql
        assert "'QA'" in sql
        assert "'DONE'" in sql
        assert 'ADD COLUMN "api_key"' in sql

    def test_rendered_sql_includes_visit_counter_seed_row(self):
        sql = db_init_mod.render_sql()
        assert 'INSERT INTO "visit_counter" ("id", "count") VALUES (1, 0);' in sql

    def test_rendered_sql_omits_legacy_schema_terms(self):
        sql = db_init_mod.render_sql()

        for legacy in [
            "'TRABAJO'",
            "'PENDIENTE'",
            "'EN_PROGRESO'",
            "'HECHO'",
            "password_hash",
            "api_key_hash",
        ]:
            assert legacy not in sql

    def test_rendered_sql_matches_all_versioned_sql_migrations(self):
        sql = db_init_mod.render_sql()

        for rel_path in [
            "drizzle/0000_tiresome_maginty.sql",
            "drizzle/0001_add_qa_status.sql",
            "drizzle/0002_add_api_key.sql",
            "drizzle/0003_add_visit_counter.sql",
        ]:
            content = (REPO_ROOT / rel_path).read_text().strip()
            assert content in sql

    def test_missing_drizzle_directory_raises_system_exit(self, monkeypatch, tmp_path):
        monkeypatch.setattr(db_init_mod, "MIGRATIONS_DIR", tmp_path)
        with pytest.raises(SystemExit):
            db_init_mod.render_sql()


class TestDBInitCLI:

    def test_stdout_output_contains_current_schema(self, capsys):
        test_args = ["db-init.py"]
        with patch("sys.argv", test_args):
            db_init_mod.main()

        captured = capsys.readouterr()
        assert 'CREATE TABLE "tickets"' in captured.out
        assert "'QA'" in captured.out
        assert "TRABAJO" not in captured.out

    def test_output_file_is_written(self, tmp_path):
        output_file = tmp_path / "init.sql"
        test_args = ["db-init.py", "--output", str(output_file)]
        with patch("sys.argv", test_args):
            db_init_mod.main()

        assert output_file.exists()
        content = output_file.read_text()
        assert 'CREATE TABLE "calendar_tokens"' in content

    def test_output_file_has_secure_permissions(self, tmp_path):
        output_file = tmp_path / "init.sql"
        test_args = ["db-init.py", "--output", str(output_file)]
        with patch("sys.argv", test_args):
            db_init_mod.main()

        permissions = output_file.stat().st_mode & 0o777
        assert permissions == 0o600, f"Expected 600, got {oct(permissions)}"

    def test_operations_workflow_no_longer_installs_jinja_for_db_init(self):
        workflow = (REPO_ROOT / ".github" / "workflows" / "operations.yml").read_text()

        assert "pip install jinja2" not in workflow
        assert "python3 scripts/db-init.py --output /tmp/init.sql" in workflow
