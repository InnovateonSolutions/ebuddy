"""Tests estructurales para mantener la documentación centralizada y vigente."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text()


def test_claude_file_is_removed():
    assert not (REPO_ROOT / "CLAUDE.md").exists(), (
        "CLAUDE.md debe eliminarse para evitar una segunda fuente de verdad"
    )


def test_docs_readme_reflects_current_repo_shape():
    content = read("docs/README.md")
    assert "AGENTS.md" in content, "docs/README.md debe señalar la fuente de verdad del proceso"
    assert "lib/types.ts" in content, "docs/README.md debe reflejar la nueva organización de tipos"
    assert "lib/tickets.ts" in content, "docs/README.md debe reflejar la nueva organización por dominio"
    assert "c4-nivel-1-contexto.md" in content
    assert "c4-nivel-2-contenedores.md" in content
    assert "Costo de la solución integral" in content
    assert "Nosotros / proveedor" in content
    assert "Cliente" in content
    assert "CLAUDE.md                   Contexto para Claude Code" not in content
    assert "`CLAUDE.md`" not in content
    assert "plan-trabajo-mvp" not in content
    assert "homelab.md" not in content
    assert "Supabase" not in content
    assert "useRealtimeTickets" not in content


def test_getting_started_matches_current_stack():
    content = read("docs/development/getting-started.md")
    assert "DATABASE_URL" in content, "getting-started debe documentar la DB real"
    assert "docker compose up -d db" in content, "getting-started debe usar PostgreSQL local actual"
    assert "Supabase" not in content
    assert "supabase/migrations" not in content


def test_environment_variables_match_env_example():
    content = read("docs/development/environment-variables.md")
    assert "DATABASE_URL" in content
    assert "AUTH_SECRET" in content
    assert "NEXT_PUBLIC_SUPABASE_URL" not in content
    assert "SUPABASE_SERVICE_ROLE_KEY" not in content


def test_architecture_overview_mentions_current_stack_only():
    content = read("docs/architecture/overview.md")
    assert "Drizzle" in content
    assert "next-auth" in content or "Auth.js" in content
    assert "Supabase" not in content
    assert "ADR 004" not in content
    assert "ADR 005" not in content


def test_historical_supabase_adr_is_removed():
    assert not (REPO_ROOT / "docs" / "architecture" / "adr" / "002-supabase-baas.md").exists(), (
        "ADR 002 debe eliminarse si ya no aporta a la arquitectura vigente"
    )


def test_remaining_operational_docs_no_longer_describe_supabase_as_current():
    for rel_path in [
        "docs/infrastructure/secrets.md",
        "docs/operations/runbook.md",
        "docs/infrastructure/networking.md",
    ]:
        content = read(rel_path)
        assert "Supabase" not in content, (
            f"{rel_path} no debe describir Supabase como parte del stack actual"
        )


def test_legacy_adrs_are_marked_historical_when_they_conflict_with_current_stack():
    for rel_path in [
        "docs/architecture/adr/001-nextjs-monorepo.md",
    ]:
        content = read(rel_path)
        assert "Aprobada" in content or "Aceptado" in content or "Estado:" in content, (
            f"{rel_path} debe ser un ADR vivo, no un documento fantasma"
        )


def test_openclaw_doc_is_removed():
    assert not (REPO_ROOT / "docs" / "integrations" / "openclaw.md").exists(), (
        "docs/integrations/openclaw.md debe eliminarse si solo conserva ideas futuras"
    )


def test_planning_and_c4_docs_are_removed():
    for rel_path in [
        "docs/plan-trabajo-mvp.md",
        "docs/infrastructure/homelab.md",
        "docs/architecture/adr/004-ecs-fargate.md",
        "docs/architecture/adr/005-openclaw-homelab.md",
    ]:
        assert not (REPO_ROOT / rel_path).exists(), (
            f"{rel_path} debe eliminarse si ya no es documentación viva del sistema"
        )


def test_c4_docs_exist_and_match_current_stack():
    level_1 = read("docs/architecture/c4-nivel-1-contexto.md")
    level_2 = read("docs/architecture/c4-nivel-2-contenedores.md")

    for content in [level_1, level_2]:
        assert "Next.js" in content
        assert "PostgreSQL" in content
        assert "Drizzle" in content
        assert "next-auth" in content or "Auth.js" in content
        assert "Whisper" in content
        assert "Claude" in content
        assert "Supabase" not in content
        assert "OpenClaw" not in content
